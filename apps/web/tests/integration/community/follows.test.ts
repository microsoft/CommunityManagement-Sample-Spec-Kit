import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { follow, unfollow, getFollowers, getFollowing, getFriends } from "@/lib/follows/service";
import { getRelationship } from "@/lib/follows/relationship";
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

describe("Follow Service", () => {
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

    // Create user profiles for JOIN queries
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Alice')", [userAId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Bob')", [userBId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Carol')", [userCId]);
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("follow", () => {
    it("should follow another user", async () => {
      const result = await follow(userAId, userBId);
      expect(result.followed).toBe(true);
      expect(result.becameFriends).toBe(false);
    });

    it("should detect mutual follow (became friends)", async () => {
      await follow(userBId, userAId);
      const result = await follow(userAId, userBId);
      expect(result.followed).toBe(true);
      expect(result.becameFriends).toBe(true);
    });

    it("should not follow yourself", async () => {
      await expect(follow(userAId, userAId)).rejects.toThrow("Cannot follow yourself");
    });

    it("should not follow a blocked user", async () => {
      await db.query("INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)", [userAId, userBId]);
      await expect(follow(userAId, userBId)).rejects.toThrow("Cannot follow a blocked user");
    });

    it("should return followed=false for duplicate follow", async () => {
      await follow(userAId, userBId);
      const result = await follow(userAId, userBId);
      expect(result.followed).toBe(false);
    });
  });

  describe("unfollow", () => {
    it("should unfollow a followed user", async () => {
      await follow(userAId, userBId);
      const result = await unfollow(userAId, userBId);
      expect(result).toBe(true);
    });

    it("should return false when not following", async () => {
      const result = await unfollow(userAId, userBId);
      expect(result).toBe(false);
    });
  });

  describe("getRelationship", () => {
    it("should return 'self' for same user", async () => {
      expect(await getRelationship(userAId, userAId)).toBe("self");
    });

    it("should return 'none' when no follow exists", async () => {
      expect(await getRelationship(userAId, userBId)).toBe("none");
    });

    it("should return 'following' when viewer follows profile owner", async () => {
      await follow(userAId, userBId);
      expect(await getRelationship(userAId, userBId)).toBe("following");
    });

    it("should return 'follower' when profile owner follows viewer", async () => {
      await follow(userBId, userAId);
      expect(await getRelationship(userAId, userBId)).toBe("follower");
    });

    it("should return 'friend' for mutual follow", async () => {
      await follow(userAId, userBId);
      await follow(userBId, userAId);
      expect(await getRelationship(userAId, userBId)).toBe("friend");
    });

    it("should return 'none' for null viewer", async () => {
      expect(await getRelationship(null, userBId)).toBe("none");
    });
  });

  describe("getFollowers", () => {
    it("should list followers of a user", async () => {
      await follow(userBId, userAId);
      await follow(userCId, userAId);
      const result = await getFollowers(userAId, userAId);
      expect(result.total).toBe(2);
      expect(result.entries).toHaveLength(2);
    });

    it("should return empty for user with no followers", async () => {
      const result = await getFollowers(userAId, null);
      expect(result.total).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });

  describe("getFollowing", () => {
    it("should list users someone is following", async () => {
      await follow(userAId, userBId);
      await follow(userAId, userCId);
      const result = await getFollowing(userAId, userAId);
      expect(result.total).toBe(2);
      expect(result.entries).toHaveLength(2);
    });
  });

  describe("getFriends", () => {
    it("should list mutual follows as friends", async () => {
      await follow(userAId, userBId);
      await follow(userBId, userAId);
      await follow(userAId, userCId); // Not mutual
      const result = await getFriends(userAId);
      expect(result.total).toBe(1);
      expect(result.entries[0].userId).toBe(userBId);
    });

    it("should return empty when no mutual follows", async () => {
      await follow(userAId, userBId);
      const result = await getFriends(userAId);
      expect(result.total).toBe(0);
    });
  });
});
