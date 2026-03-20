import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  searchDirectory,
  setDirectoryVisibility,
  getDirectoryVisibility,
} from "@/lib/directory/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let userAId: string; // viewer
let userBId: string; // directory member
let userCId: string; // another directory member
let userDId: string; // not in directory
let countryId: string;
let cityId: string;

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

async function createUser(pglite: PGlite, email: string, name: string): Promise<string> {
  const r = await pglite.query<{ id: string }>(
    "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
    [email, name],
  );
  return r.rows[0].id;
}

describe("Directory Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    userAId = await createUser(db, "alice@test.com", "Alice");
    userBId = await createUser(db, "bob@test.com", "Bob");
    userCId = await createUser(db, "carol@test.com", "Carol");
    userDId = await createUser(db, "dave@test.com", "Dave");

    const countryResult = await db.query<{ id: string }>(
      "INSERT INTO countries (name, code, continent_code) VALUES ('UK', 'GB', 'EU') RETURNING id",
    );
    countryId = countryResult.rows[0].id;

    const cityResult = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', $1, 51.5074, -0.1278, 'Europe/London') RETURNING id",
      [countryId],
    );
    cityId = cityResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("setDirectoryVisibility / getDirectoryVisibility", () => {
    it("should default to false for users with no profile", async () => {
      const visible = await getDirectoryVisibility(userAId);
      expect(visible).toBe(false);
    });

    it("should set visibility to true", async () => {
      await setDirectoryVisibility(userBId, true);
      const visible = await getDirectoryVisibility(userBId);
      expect(visible).toBe(true);
    });

    it("should toggle visibility back to false", async () => {
      await setDirectoryVisibility(userBId, true);
      await setDirectoryVisibility(userBId, false);
      const visible = await getDirectoryVisibility(userBId);
      expect(visible).toBe(false);
    });
  });

  describe("searchDirectory", () => {
    beforeEach(async () => {
      // Make Bob and Carol opt-in to the directory
      await setDirectoryVisibility(userBId, true);
      await setDirectoryVisibility(userCId, true);
      // Dave has not opted in
    });

    it("should only return directory_visible=true members", async () => {
      const result = await searchDirectory(userAId, {});
      const userIds = result.entries.map((e) => e.userId);
      expect(userIds).toContain(userBId);
      expect(userIds).toContain(userCId);
      expect(userIds).not.toContain(userDId);
    });

    it("should not include the viewer in their own directory results", async () => {
      await setDirectoryVisibility(userAId, true);
      const result = await searchDirectory(userAId, {});
      const userIds = result.entries.map((e) => e.userId);
      expect(userIds).not.toContain(userAId);
    });

    it("should not include blocked users", async () => {
      // userA blocks userB
      await db.query(
        "INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)",
        [userAId, userBId],
      );
      const result = await searchDirectory(userAId, {});
      const userIds = result.entries.map((e) => e.userId);
      expect(userIds).not.toContain(userBId);
      expect(userIds).toContain(userCId);
    });

    it("should not include users who blocked the viewer", async () => {
      // userB blocks userA
      await db.query(
        "INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)",
        [userBId, userAId],
      );
      const result = await searchDirectory(userAId, {});
      const userIds = result.entries.map((e) => e.userId);
      expect(userIds).not.toContain(userBId);
    });

    it("should return correct total count", async () => {
      const result = await searchDirectory(userAId, {});
      expect(result.total).toBe(2);
    });

    describe("text search (q)", () => {
      beforeEach(async () => {
        await db.query(
          "UPDATE user_profiles SET display_name = 'Bob Smith', bio = 'I love acro' WHERE user_id = $1",
          [userBId],
        );
        await db.query(
          "UPDATE user_profiles SET display_name = 'Carol Jones', bio = 'Yoga teacher' WHERE user_id = $1",
          [userCId],
        );
      });

      it("should filter by display name", async () => {
        const result = await searchDirectory(userAId, { q: "Bob" });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userBId);
      });

      it("should filter by bio", async () => {
        const result = await searchDirectory(userAId, { q: "yoga" });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userCId);
      });

      it("should return no results for non-matching query", async () => {
        const result = await searchDirectory(userAId, { q: "xyzzy" });
        expect(result.entries).toHaveLength(0);
      });
    });

    describe("city filter", () => {
      it("should filter by city", async () => {
        await db.query(
          "UPDATE user_profiles SET home_city_id = $1 WHERE user_id = $2",
          [cityId, userBId],
        );
        const result = await searchDirectory(userAId, { cityId });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userBId);
      });

      it("should return empty for city with no members", async () => {
        const otherCity = await db.query<{ id: string }>(
          "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('Manchester', 'manchester', $1, 53.483, -2.244, 'Europe/London') RETURNING id",
          [countryId],
        );
        const result = await searchDirectory(userAId, { cityId: otherCity.rows[0].id });
        expect(result.entries).toHaveLength(0);
      });
    });

    describe("role filter", () => {
      it("should filter by default role", async () => {
        await db.query(
          "UPDATE user_profiles SET default_role = 'flyer' WHERE user_id = $1",
          [userBId],
        );
        await db.query(
          "UPDATE user_profiles SET default_role = 'base' WHERE user_id = $1",
          [userCId],
        );
        const result = await searchDirectory(userAId, { role: "flyer" });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userBId);
      });
    });

    describe("relationship detection", () => {
      it("should show 'none' relationship for strangers", async () => {
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.relationship).toBe("none");
      });

      it("should show 'following' when viewer follows member", async () => {
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userAId, userBId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.relationship).toBe("following");
      });

      it("should show 'follower' when member follows viewer", async () => {
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userBId, userAId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.relationship).toBe("follower");
      });

      it("should show 'friend' for mutual follows", async () => {
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userAId, userBId],
        );
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userBId, userAId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.relationship).toBe("friend");
      });
    });

    describe("relationship filter", () => {
      beforeEach(async () => {
        // userA follows userB, userB follows userA (friends), userC is a stranger
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userAId, userBId],
        );
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userBId, userAId],
        );
      });

      it("should filter to friends only", async () => {
        const result = await searchDirectory(userAId, { relationship: "friends" });
        const ids = result.entries.map((e) => e.userId);
        expect(ids).toContain(userBId);
        expect(ids).not.toContain(userCId);
      });

      it("should filter to following", async () => {
        const result = await searchDirectory(userAId, { relationship: "following" });
        const ids = result.entries.map((e) => e.userId);
        expect(ids).toContain(userBId);
        expect(ids).not.toContain(userCId);
      });
    });

    describe("cursor pagination", () => {
      it("should paginate with cursor", async () => {
        const page1 = await searchDirectory(userAId, { limit: 1 });
        expect(page1.entries).toHaveLength(1);
        expect(page1.nextCursor).not.toBeNull();

        const page2 = await searchDirectory(userAId, {
          limit: 1,
          cursor: page1.nextCursor!,
        });
        expect(page2.entries).toHaveLength(1);
        expect(page2.entries[0].userId).not.toBe(page1.entries[0].userId);
        expect(page2.nextCursor).toBeNull();
      });

      it("should return null nextCursor when no more pages", async () => {
        const result = await searchDirectory(userAId, { limit: 50 });
        expect(result.nextCursor).toBeNull();
      });
    });

    describe("social link visibility", () => {
      it("should filter social links by relationship level", async () => {
        // Bob has a 'friends' visibility link and an 'everyone' link
        await db.query(
          "INSERT INTO social_links (user_id, platform, url, visibility) VALUES ($1, 'instagram', 'https://ig.com/bob', 'everyone')",
          [userBId],
        );
        await db.query(
          "INSERT INTO social_links (user_id, platform, url, visibility) VALUES ($1, 'youtube', 'https://yt.com/bob', 'friends')",
          [userBId],
        );

        // As a stranger, should only see 'everyone' links
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.socialLinks).toHaveLength(1);
        expect(bobEntry?.socialLinks[0].platform).toBe("instagram");
      });
    });

    describe("profile completeness", () => {
      it("should compute 0 completeness for empty profile", async () => {
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.profileCompleteness).toBe(0);
      });

      it("should compute completeness based on fields set", async () => {
        await db.query(
          "UPDATE user_profiles SET display_name = 'Bob', bio = 'Hello', avatar_url = 'https://example.com/bob.jpg', home_city_id = $1, default_role = 'base' WHERE user_id = $2",
          [cityId, userBId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        // display_name(20) + bio(20) + avatar(20) + city(20) + role(10) = 90
        expect(bobEntry?.profileCompleteness).toBe(90);
      });
    });

    describe("verified teacher filter", () => {
      it("should filter to verified teachers only", async () => {
        // Insert teacher profile for userB
        await db.query(
          `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
           VALUES ($1, '{}', 'verified')`,
          [userBId],
        );
        const result = await searchDirectory(userAId, { verifiedTeacher: true });
        const ids = result.entries.map((e) => e.userId);
        expect(ids).toContain(userBId);
        expect(ids).not.toContain(userCId);
      });

      it("should mark isVerifiedTeacher true for verified teachers", async () => {
        await db.query(
          `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
           VALUES ($1, '{}', 'verified')`,
          [userBId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        const carolEntry = result.entries.find((e) => e.userId === userCId);
        expect(bobEntry?.isVerifiedTeacher).toBe(true);
        expect(carolEntry?.isVerifiedTeacher).toBe(false);
      });
    });
  });
});
