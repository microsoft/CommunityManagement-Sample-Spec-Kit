import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  getOrCreateThread,
  listMessages,
  createMessage,
  editMessage,
  deleteMessage,
  lockThread,
  pinMessage,
  toggleReaction,
} from "@/lib/threads/service";
import { getThreadAccess } from "@/lib/threads/access";
import { blockUser } from "@/lib/safety/blocks";
import { muteUser } from "@/lib/safety/mutes";
import fs from "fs";
import path from "path";

let db: PGlite;
let userAId: string;
let userBId: string;
let userCId: string;
let cityId: string;
let eventId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

function futureDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

describe("Threads & Messages", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('alice@test.com', 'Alice') RETURNING id",
    );
    userAId = r1.rows[0].id;
    const r2 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('bob@test.com', 'Bob') RETURNING id",
    );
    userBId = r2.rows[0].id;
    const r3 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('carol@test.com', 'Carol') RETURNING id",
    );
    userCId = r3.rows[0].id;

    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Alice')", [userAId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Bob')", [userBId]);

    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')",
    );
    const cityResult = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5, -0.1, 'Europe/London') RETURNING id",
    );
    cityId = cityResult.rows[0].id;

    const venueResult = await db.query<{ id: string }>(
      "INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Hall', '1 St', $1, 51.5, -0.1, $2) RETURNING id",
      [cityId, userAId],
    );
    const eventResult = await db.query<{ id: string }>(
      `INSERT INTO events (title, start_datetime, end_datetime, venue_id, category, skill_level, capacity, created_by)
       VALUES ('Test Event', $1, $2, $3, 'jam', 'all_levels', 20, $4) RETURNING id`,
      [futureDate(7), futureDate(8), venueResult.rows[0].id, userAId],
    );
    eventId = eventResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("getOrCreateThread", () => {
    it("should create a new thread for an entity", async () => {
      const thread = await getOrCreateThread("city", cityId);
      expect(thread.entityType).toBe("city");
      expect(thread.entityId).toBe(cityId);
      expect(thread.isLocked).toBe(false);
    });

    it("should return existing thread on second call", async () => {
      const t1 = await getOrCreateThread("city", cityId);
      const t2 = await getOrCreateThread("city", cityId);
      expect(t1.id).toBe(t2.id);
    });
  });

  describe("thread access", () => {
    it("should allow any authenticated user to post in city threads", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const access = await getThreadAccess(thread.id, userAId);
      expect(access.canRead).toBe(true);
      expect(access.canPost).toBe(true);
    });

    it("should require RSVP for event thread posting", async () => {
      const thread = await getOrCreateThread("event", eventId);
      const access = await getThreadAccess(thread.id, userBId);
      expect(access.canRead).toBe(true);
      expect(access.canPost).toBe(false);
      expect(access.reason).toContain("RSVP");
    });

    it("should allow posting in event thread with confirmed RSVP", async () => {
      const thread = await getOrCreateThread("event", eventId);
      await db.query(
        "INSERT INTO rsvps (event_id, user_id, status, role) VALUES ($1, $2, 'confirmed', 'base')",
        [eventId, userBId],
      );
      const access = await getThreadAccess(thread.id, userBId);
      expect(access.canPost).toBe(true);
    });

    it("should deny posting in locked thread", async () => {
      const thread = await getOrCreateThread("city", cityId);
      await lockThread(thread.id, true, userAId);
      const access = await getThreadAccess(thread.id, userBId);
      expect(access.canPost).toBe(false);
      expect(access.reason).toContain("locked");
    });

    it("should deny posting for unauthenticated user", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const access = await getThreadAccess(thread.id, null);
      expect(access.canPost).toBe(false);
    });
  });

  describe("createMessage", () => {
    it("should create a message in a city thread", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Hello city!");
      expect(msg.content).toBe("Hello city!");
      expect(msg.authorId).toBe(userAId);
      expect(msg.authorName).toBe("Alice");
    });

    it("should reject message in event thread without RSVP", async () => {
      const thread = await getOrCreateThread("event", eventId);
      await expect(createMessage(thread.id, userBId, "Hello")).rejects.toThrow("RSVP");
    });
  });

  describe("listMessages", () => {
    it("should list messages in chronological order", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const m1 = await createMessage(thread.id, userAId, "First");
      const m2 = await createMessage(thread.id, userBId, "Second");
      const result = await listMessages(thread.id, userAId);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].id).toBe(m1.id);
      expect(result.messages[1].id).toBe(m2.id);
    });

    it("should filter out blocked user messages", async () => {
      const thread = await getOrCreateThread("city", cityId);
      await createMessage(thread.id, userAId, "Visible");
      await createMessage(thread.id, userBId, "Blocked");
      await blockUser(userAId, userBId);
      const result = await listMessages(thread.id, userAId);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe("Visible");
    });

    it("should filter out muted user messages", async () => {
      const thread = await getOrCreateThread("city", cityId);
      await createMessage(thread.id, userAId, "Visible");
      await createMessage(thread.id, userBId, "Muted");
      await muteUser(userAId, userBId);
      const result = await listMessages(thread.id, userAId);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe("Visible");
    });

    it("should paginate with cursor", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const m1 = await createMessage(thread.id, userAId, "Page 1");
      await createMessage(thread.id, userAId, "Page 2");
      const result = await listMessages(thread.id, null, m1.id, 1);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe("Page 2");
    });
  });

  describe("editMessage", () => {
    it("should edit a message and preserve history", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Original");
      const edited = await editMessage(msg.id, userAId, "Updated");
      expect(edited!.content).toBe("Updated");
      expect(edited!.editHistory).toHaveLength(1);
      expect(edited!.editHistory[0].content).toBe("Original");
    });

    it("should reject edit by non-author", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Original");
      await expect(editMessage(msg.id, userBId, "Hacked")).rejects.toThrow("Only the author");
    });

    it("should return null for non-existent message", async () => {
      const result = await editMessage("00000000-0000-0000-0000-999999999999", userAId, "X");
      expect(result).toBeNull();
    });
  });

  describe("deleteMessage", () => {
    it("should soft-delete a message by author", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "To delete");
      const result = await deleteMessage(msg.id, userAId, false);
      expect(result).toBe(true);

      // Deleted message should show [deleted]
      const list = await listMessages(thread.id, userBId);
      const deleted = list.messages.find((m) => m.id === msg.id);
      expect(deleted!.content).toBe("[deleted]");
      expect(deleted!.isDeleted).toBe(true);
    });

    it("should allow admin to delete any message", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Admin delete");
      const result = await deleteMessage(msg.id, userBId, true);
      expect(result).toBe(true);
    });

    it("should reject non-author non-admin delete", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Protected");
      await expect(deleteMessage(msg.id, userBId, false)).rejects.toThrow("Only the author or an admin");
    });
  });

  describe("lockThread", () => {
    it("should lock a thread", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const locked = await lockThread(thread.id, true, userAId);
      expect(locked!.isLocked).toBe(true);
    });

    it("should unlock a thread", async () => {
      const thread = await getOrCreateThread("city", cityId);
      await lockThread(thread.id, true, userAId);
      const unlocked = await lockThread(thread.id, false, userAId);
      expect(unlocked!.isLocked).toBe(false);
    });

    it("should return null for non-existent thread", async () => {
      const result = await lockThread("00000000-0000-0000-0000-999999999999", true, userAId);
      expect(result).toBeNull();
    });
  });

  describe("pinMessage", () => {
    it("should pin a message", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Pin me");
      const result = await pinMessage(msg.id, userAId, true);
      expect(result).toBe(true);
    });

    it("should unpin a message", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Unpin me");
      await pinMessage(msg.id, userAId, true);
      const result = await pinMessage(msg.id, userAId, false);
      expect(result).toBe(true);
    });

    it("should enforce max 3 pinned messages per thread", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const m1 = await createMessage(thread.id, userAId, "Pin 1");
      const m2 = await createMessage(thread.id, userAId, "Pin 2");
      const m3 = await createMessage(thread.id, userAId, "Pin 3");
      const m4 = await createMessage(thread.id, userAId, "Pin 4");
      await pinMessage(m1.id, userAId, true);
      await pinMessage(m2.id, userAId, true);
      await pinMessage(m3.id, userAId, true);
      await expect(pinMessage(m4.id, userAId, true)).rejects.toThrow("Maximum 3 pinned");
    });
  });

  describe("reactions", () => {
    it("should add a reaction", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "React to me");
      const result = await toggleReaction(msg.id, userBId, "heart");
      expect(result.action).toBe("added");
      expect(result.count).toBe(1);
    });

    it("should toggle off an existing reaction", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Toggle");
      await toggleReaction(msg.id, userBId, "heart");
      const result = await toggleReaction(msg.id, userBId, "heart");
      expect(result.action).toBe("removed");
      expect(result.count).toBe(0);
    });

    it("should allow multiple different reactions from same user", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Multi react");
      await toggleReaction(msg.id, userBId, "heart");
      const result = await toggleReaction(msg.id, userBId, "fire");
      expect(result.action).toBe("added");
      expect(result.count).toBe(1); // count for 'fire' emoji
    });

    it("should include reaction summary in listed messages", async () => {
      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "With reactions");
      await toggleReaction(msg.id, userBId, "thumbs_up");
      await toggleReaction(msg.id, userCId, "thumbs_up");
      const list = await listMessages(thread.id, userBId);
      const m = list.messages.find((m) => m.id === msg.id);
      const thumbs = m!.reactions.find((r) => r.emoji === "thumbs_up");
      expect(thumbs!.count).toBe(2);
      expect(thumbs!.reacted).toBe(true);
    });
  });
});
