import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { requestExport, processExport, getExports, getExportById } from "@/lib/gdpr/full-export";
import { deleteAccount } from "@/lib/gdpr/deletion";
import { follow } from "@/lib/follows/service";
import { blockUser } from "@/lib/safety/blocks";
import { muteUser } from "@/lib/safety/mutes";
import { getOrCreateThread, createMessage, toggleReaction } from "@/lib/threads/service";
import { submitReport } from "@/lib/safety/reports";
import { setSocialLinks } from "@/lib/profiles/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let userAId: string;
let userBId: string;
let cityId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

describe("GDPR", () => {
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

    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Alice')", [userAId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Bob')", [userBId]);

    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')",
    );
    const cityResult = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5, -0.1, 'Europe/London') RETURNING id",
    );
    cityId = cityResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("Data Export", () => {
    it("should request an export", async () => {
      const result = await requestExport(userAId);
      expect(result.exportId).toBeDefined();
      expect(result.status).toBe("pending");
    });

    it("should reject duplicate active export", async () => {
      await requestExport(userAId);
      await expect(requestExport(userAId)).rejects.toThrow("already in progress");
    });

    it("should process export and gather all data", async () => {
      // Set up social links
      await setSocialLinks(userAId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
      ]);
      // Follow someone
      await follow(userAId, userBId);
      // Post a message
      const thread = await getOrCreateThread("city", cityId);
      await createMessage(thread.id, userAId, "Hello from Alice");

      const exp = await requestExport(userAId);
      const data = await processExport(exp.exportId);

      expect(data.profile).not.toBeNull();
      expect(data.socialLinks).toHaveLength(1);
      expect(data.follows.following).toContain(userBId);
      expect(data.messagesAuthored.length).toBeGreaterThanOrEqual(1);
    });

    it("should list exports for user", async () => {
      const exp = await requestExport(userAId);
      await processExport(exp.exportId);
      const exports = await getExports(userAId);
      expect(exports).toHaveLength(1);
      expect(exports[0].status).toBe("completed");
    });

    it("should get export by ID", async () => {
      const exp = await requestExport(userAId);
      await processExport(exp.exportId);
      const found = await getExportById(exp.exportId, userAId);
      expect(found).not.toBeNull();
      expect(found!.status).toBe("completed");
    });

    it("should return null for wrong user export lookup", async () => {
      const exp = await requestExport(userAId);
      const found = await getExportById(exp.exportId, userBId);
      expect(found).toBeNull();
    });
  });

  describe("Account Deletion", () => {
    it("should require 'DELETE' confirmation", async () => {
      await expect(deleteAccount(userAId, "nope")).rejects.toThrow("Must confirm");
    });

    it("should reject deletion of sentinel user", async () => {
      await expect(
        deleteAccount("00000000-0000-0000-0000-000000000000", "DELETE"),
      ).rejects.toThrow("Cannot delete sentinel");
    });

    it("should reject deletion of non-existent user", async () => {
      await expect(
        deleteAccount("00000000-0000-0000-0000-999999999999", "DELETE"),
      ).rejects.toThrow("User not found");
    });

    it("should delete account and anonymise data", async () => {
      // Set up data
      await setSocialLinks(userAId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
      ]);
      await follow(userAId, userBId);
      await follow(userBId, userAId);
      await blockUser(userAId, userBId);
      // Note: blockUser already severed follows above, but we re-test the deletion path

      // Unblock first so we can create other test data
      await db.query("DELETE FROM blocks WHERE blocker_id = $1", [userAId]);
      await muteUser(userAId, userBId);

      const thread = await getOrCreateThread("city", cityId);
      const msg = await createMessage(thread.id, userAId, "Alice's message");
      await toggleReaction(msg.id, userAId, "heart");
      await submitReport(userAId, userBId, "spam");
      await submitReport(userBId, userAId, "harassment");

      const result = await deleteAccount(userAId, "DELETE");
      expect(result).toBe(true);

      // Verify PII removed
      const user = await db.query<{ email: string; name: string }>(
        "SELECT email, name FROM users WHERE id = $1",
        [userAId],
      );
      expect(user.rows[0].name).toBe("Deleted User");
      expect(user.rows[0].email).toContain("deleted_");

      // Verify social links removed
      const links = await db.query("SELECT 1 FROM social_links WHERE user_id = $1", [userAId]);
      expect(links.rows).toHaveLength(0);

      // Verify profile removed
      const profile = await db.query("SELECT 1 FROM user_profiles WHERE user_id = $1", [userAId]);
      expect(profile.rows).toHaveLength(0);

      // Verify follows removed
      const follows = await db.query(
        "SELECT 1 FROM follows WHERE follower_id = $1 OR followee_id = $1",
        [userAId],
      );
      expect(follows.rows).toHaveLength(0);

      // Verify mutes removed
      const mutes = await db.query(
        "SELECT 1 FROM mutes WHERE muter_id = $1 OR muted_id = $1",
        [userAId],
      );
      expect(mutes.rows).toHaveLength(0);

      // Verify messages anonymised (author_id = sentinel)
      const messages = await db.query<{ author_id: string; content: string }>(
        "SELECT author_id, content FROM messages WHERE id = $1",
        [msg.id],
      );
      expect(messages.rows[0].author_id).toBe("00000000-0000-0000-0000-000000000000");
      expect(messages.rows[0].content).toBe("[deleted]");

      // Verify reactions removed
      const reactions = await db.query("SELECT 1 FROM reactions WHERE user_id = $1", [userAId]);
      expect(reactions.rows).toHaveLength(0);

      // Verify reports BY user removed
      const reportsByUser = await db.query("SELECT 1 FROM reports WHERE reporter_id = $1", [userAId]);
      expect(reportsByUser.rows).toHaveLength(0);

      // Verify reports ABOUT user anonymised
      const reportsAbout = await db.query<{ reported_user_id: string }>(
        "SELECT reported_user_id FROM reports WHERE reported_user_id = '00000000-0000-0000-0000-000000000000'",
      );
      expect(reportsAbout.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
