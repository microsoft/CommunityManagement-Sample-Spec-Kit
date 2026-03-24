/**
 * Journey tests: Blocked-user visibility
 *
 * Ensures that when user A blocks user B:
 *  - User B cannot see User A's profile
 *  - User B does not appear in User A's directory results
 *  - User A does not appear in User B's directory results
 *  - Messages from the blocked/blocking party are hidden in threads
 *  - Following is severed and cannot be re-established while blocked
 *  - Unblocking restores the ability to follow and view profiles
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { blockUser, unblockUser, isBlocked, getBlockList } from "@/lib/safety/blocks";
import { follow } from "@/lib/follows/service";
import { getProfile, upsertProfile } from "@/lib/profiles/service";
import { searchDirectory, setDirectoryVisibility } from "@/lib/directory/service";
import {
  getOrCreateThread,
  createMessage,
  listMessages,
} from "@/lib/threads/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let aliceId: string; // blocker
let bobId: string;   // blocked by Alice
let carolId: string; // uninvolved third party
let cityId: string;
let venueId: string;
let eventId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
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

describe("Blocked-user visibility journeys", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('alice@test.com', 'Alice') RETURNING id",
    );
    aliceId = r1.rows[0].id;

    const r2 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('bob@test.com', 'Bob') RETURNING id",
    );
    bobId = r2.rows[0].id;

    const r3 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('carol@test.com', 'Carol') RETURNING id",
    );
    carolId = r3.rows[0].id;

    // Profiles
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Alice')", [aliceId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Bob')", [bobId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Carol')", [carolId]);

    // Geography
    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')",
    );
    const cityResult = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5, -0.1, 'Europe/London') RETURNING id",
    );
    cityId = cityResult.rows[0].id;

    const venueResult = await db.query<{ id: string }>(
      "INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Hall', '1 St', $1, 51.5, -0.1, $2) RETURNING id",
      [cityId, aliceId],
    );
    venueId = venueResult.rows[0].id;

    const eventResult = await db.query<{ id: string }>(
      `INSERT INTO events (title, start_datetime, end_datetime, venue_id, category, skill_level, capacity, created_by)
       VALUES ('City Jam', $1, $2, $3, 'jam', 'all_levels', 20, $4) RETURNING id`,
      [futureDate(7), futureDate(8), venueId, aliceId],
    );
    eventId = eventResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("profile visibility after blocking", () => {
    it("blocked user (Bob) cannot see profile of the blocker (Alice)", async () => {
      await blockUser(aliceId, bobId);
      // Alice blocked Bob — Bob cannot see Alice's profile
      const profile = await getProfile(aliceId, bobId);
      expect(profile).toBeNull();
    });

    it("blocker (Alice) cannot see profile of blocked user (Bob)", async () => {
      await blockUser(aliceId, bobId);
      // Alice blocked Bob — Alice cannot see Bob's profile either (symmetric)
      const profile = await getProfile(bobId, aliceId);
      expect(profile).toBeNull();
    });

    it("Carol (uninvolved) can still see Alice's profile after Alice blocks Bob", async () => {
      await blockUser(aliceId, bobId);
      const profile = await getProfile(aliceId, carolId);
      expect(profile).not.toBeNull();
      expect(profile!.displayName).toBe("Alice");
    });

    it("Carol (uninvolved) can still see Bob's profile after Alice blocks Bob", async () => {
      await blockUser(aliceId, bobId);
      const profile = await getProfile(bobId, carolId);
      expect(profile).not.toBeNull();
      expect(profile!.displayName).toBe("Bob");
    });
  });

  describe("directory visibility after blocking", () => {
    beforeEach(async () => {
      await setDirectoryVisibility(aliceId, true);
      await setDirectoryVisibility(bobId, true);
      await setDirectoryVisibility(carolId, true);
    });

    it("Bob does not appear in Alice's directory search after Alice blocks Bob", async () => {
      await blockUser(aliceId, bobId);
      const result = await searchDirectory(aliceId, {});
      const ids = result.entries.map((e) => e.userId);
      expect(ids).not.toContain(bobId);
      expect(ids).toContain(carolId);
    });

    it("Alice does not appear in Bob's directory search after Alice blocks Bob", async () => {
      await blockUser(aliceId, bobId);
      const result = await searchDirectory(bobId, {});
      const ids = result.entries.map((e) => e.userId);
      expect(ids).not.toContain(aliceId);
      expect(ids).toContain(carolId);
    });

    it("Carol appears in both Alice's and Bob's search results", async () => {
      await blockUser(aliceId, bobId);
      const fromAlice = await searchDirectory(aliceId, {});
      const fromBob = await searchDirectory(bobId, {});
      expect(fromAlice.entries.map((e) => e.userId)).toContain(carolId);
      expect(fromBob.entries.map((e) => e.userId)).toContain(carolId);
    });

    it("block count is reflected in getBlockList", async () => {
      await blockUser(aliceId, bobId);
      const list = await getBlockList(aliceId);
      expect(list).toHaveLength(1);
      expect(list[0].displayName).toBe("Bob");
    });

    it("blocking a second user hides both from directory", async () => {
      await blockUser(aliceId, bobId);
      await blockUser(aliceId, carolId);
      const result = await searchDirectory(aliceId, {});
      expect(result.entries).toHaveLength(0);
    });
  });

  describe("thread message visibility after blocking", () => {
    it("messages from blocked user are hidden in thread for blocker", async () => {
      const thread = await getOrCreateThread("city", cityId);
      // Alice and Bob both post
      await createMessage(thread.id, aliceId, "Alice says hi");
      await createMessage(thread.id, bobId, "Bob says hello");
      // Alice blocks Bob
      await blockUser(aliceId, bobId);
      // Alice should only see her own message
      const result = await listMessages(thread.id, aliceId);
      const contents = result.messages.map((m) => m.content);
      expect(contents).toContain("Alice says hi");
      expect(contents).not.toContain("Bob says hello");
    });

    it("Carol sees all messages (she has no block relationship)", async () => {
      const thread = await getOrCreateThread("city", cityId);
      await createMessage(thread.id, aliceId, "Alice says hi");
      await createMessage(thread.id, bobId, "Bob says hello");
      await blockUser(aliceId, bobId);
      const result = await listMessages(thread.id, carolId);
      const contents = result.messages.map((m) => m.content);
      expect(contents).toContain("Alice says hi");
      expect(contents).toContain("Bob says hello");
    });
  });

  describe("follow severing on block", () => {
    it("existing follows are severed when block is applied", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);
      const result = await blockUser(aliceId, bobId);
      expect(result.severedFollows).toBe(2);
    });

    it("cannot follow a user who has blocked you", async () => {
      await blockUser(aliceId, bobId);
      await expect(follow(bobId, aliceId)).rejects.toThrow("Cannot follow a blocked user");
    });

    it("cannot follow a user you have blocked", async () => {
      await blockUser(aliceId, bobId);
      await expect(follow(aliceId, bobId)).rejects.toThrow("Cannot follow a blocked user");
    });
  });

  describe("unblocking restores visibility", () => {
    it("after unblocking, Bob can see Alice's profile again", async () => {
      await blockUser(aliceId, bobId);
      await unblockUser(aliceId, bobId);
      const profile = await getProfile(aliceId, bobId);
      expect(profile).not.toBeNull();
      expect(profile!.displayName).toBe("Alice");
    });

    it("after unblocking, Alice can see Bob's profile again", async () => {
      await blockUser(aliceId, bobId);
      await unblockUser(aliceId, bobId);
      const profile = await getProfile(bobId, aliceId);
      expect(profile).not.toBeNull();
    });

    it("after unblocking, Bob appears in Alice's directory search", async () => {
      await setDirectoryVisibility(bobId, true);
      await blockUser(aliceId, bobId);
      await unblockUser(aliceId, bobId);
      const result = await searchDirectory(aliceId, {});
      const ids = result.entries.map((e) => e.userId);
      expect(ids).toContain(bobId);
    });

    it("after unblocking, Alice and Bob can follow each other again", async () => {
      await blockUser(aliceId, bobId);
      await unblockUser(aliceId, bobId);
      const result = await follow(aliceId, bobId);
      expect(result.followed).toBe(true);
    });

    it("isBlocked returns false after unblocking", async () => {
      await blockUser(aliceId, bobId);
      await unblockUser(aliceId, bobId);
      expect(await isBlocked(aliceId, bobId)).toBe(false);
    });
  });

  describe("block is symmetric in visibility checks", () => {
    it("when Bob blocks Alice, Alice cannot see Bob's profile", async () => {
      await blockUser(bobId, aliceId);
      const profile = await getProfile(bobId, aliceId);
      expect(profile).toBeNull();
    });

    it("when Bob blocks Alice, Bob cannot see Alice's profile", async () => {
      await blockUser(bobId, aliceId);
      const profile = await getProfile(aliceId, bobId);
      expect(profile).toBeNull();
    });

    it("isBlocked is true in both directions regardless of who initiated", async () => {
      await blockUser(bobId, aliceId); // Bob blocks Alice
      expect(await isBlocked(aliceId, bobId)).toBe(true);
      expect(await isBlocked(bobId, aliceId)).toBe(true);
    });
  });
});
