import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { blockUser, unblockUser, isBlocked, getBlockList } from "@/lib/safety/blocks";
import { muteUser, unmuteUser, getMutedUserIds, getMuteList } from "@/lib/safety/mutes";
import { follow } from "@/lib/follows/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let userAId: string;
let userBId: string;
let userCId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

describe("Blocks & Mutes", () => {
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
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Carol')", [userCId]);
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("blockUser", () => {
    it("should block another user", async () => {
      const result = await blockUser(userAId, userBId);
      expect(result.blocked).toBe(true);
    });

    it("should sever mutual follows when blocking", async () => {
      await follow(userAId, userBId);
      await follow(userBId, userAId);
      const result = await blockUser(userAId, userBId);
      expect(result.blocked).toBe(true);
      expect(result.severedFollows).toBe(2);
    });

    it("should sever one-way follow when blocking", async () => {
      await follow(userAId, userBId);
      const result = await blockUser(userAId, userBId);
      expect(result.severedFollows).toBe(1);
    });

    it("should not block yourself", async () => {
      await expect(blockUser(userAId, userAId)).rejects.toThrow("Cannot block yourself");
    });

    it("should return blocked=false for duplicate block", async () => {
      await blockUser(userAId, userBId);
      const result = await blockUser(userAId, userBId);
      expect(result.blocked).toBe(false);
    });
  });

  describe("isBlocked", () => {
    it("should detect block in both directions (symmetric)", async () => {
      await blockUser(userAId, userBId);
      expect(await isBlocked(userAId, userBId)).toBe(true);
      expect(await isBlocked(userBId, userAId)).toBe(true);
    });

    it("should return false when not blocked", async () => {
      expect(await isBlocked(userAId, userBId)).toBe(false);
    });
  });

  describe("unblockUser", () => {
    it("should unblock a blocked user", async () => {
      await blockUser(userAId, userBId);
      const result = await unblockUser(userAId, userBId);
      expect(result).toBe(true);
      expect(await isBlocked(userAId, userBId)).toBe(false);
    });

    it("should return false when not blocked", async () => {
      const result = await unblockUser(userAId, userBId);
      expect(result).toBe(false);
    });
  });

  describe("getBlockList", () => {
    it("should list blocked users with display names", async () => {
      await blockUser(userAId, userBId);
      await blockUser(userAId, userCId);
      const list = await getBlockList(userAId);
      expect(list).toHaveLength(2);
      const names = list.map((e) => e.displayName);
      expect(names).toContain("Bob");
      expect(names).toContain("Carol");
    });
  });

  describe("muteUser", () => {
    it("should mute another user", async () => {
      const result = await muteUser(userAId, userBId);
      expect(result).toBe(true);
    });

    it("should not mute yourself", async () => {
      await expect(muteUser(userAId, userAId)).rejects.toThrow("Cannot mute yourself");
    });

    it("should return false for duplicate mute", async () => {
      await muteUser(userAId, userBId);
      const result = await muteUser(userAId, userBId);
      expect(result).toBe(false);
    });
  });

  describe("getMutedUserIds", () => {
    it("should return list of muted user IDs", async () => {
      await muteUser(userAId, userBId);
      await muteUser(userAId, userCId);
      const ids = await getMutedUserIds(userAId);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(userBId);
      expect(ids).toContain(userCId);
    });

    it("should return empty when no mutes", async () => {
      const ids = await getMutedUserIds(userAId);
      expect(ids).toEqual([]);
    });
  });

  describe("unmuteUser", () => {
    it("should unmute a muted user", async () => {
      await muteUser(userAId, userBId);
      const result = await unmuteUser(userAId, userBId);
      expect(result).toBe(true);
      const ids = await getMutedUserIds(userAId);
      expect(ids).not.toContain(userBId);
    });

    it("should return false when not muted", async () => {
      const result = await unmuteUser(userAId, userBId);
      expect(result).toBe(false);
    });
  });

  describe("getMuteList", () => {
    it("should list muted users with display names", async () => {
      await muteUser(userAId, userBId);
      const list = await getMuteList(userAId);
      expect(list).toHaveLength(1);
      expect(list[0].displayName).toBe("Bob");
    });
  });
});
