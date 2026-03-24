import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  searchDirectory,
  setDirectoryVisibility,
  getDirectoryVisibility,
} from "@/lib/directory/service";
import { getProfile, upsertProfile } from "@/lib/profiles/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let userAId: string; // viewer
let userBId: string; // directory member
let userCId: string; // another directory member
let userDId: string; // not in directory
let geoId: string; // geography row (London)
let geoId2: string; // geography row (Paris)

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

    const geoResult = await db.query<{ id: string }>(
      `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
       VALUES ('london', 'united_kingdom', 'europe', 'London', 'United Kingdom', 'Europe') RETURNING id`,
    );
    geoId = geoResult.rows[0].id;

    const geoResult2 = await db.query<{ id: string }>(
      `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
       VALUES ('paris', 'france', 'europe', 'Paris', 'France', 'Europe') RETURNING id`,
    );
    geoId2 = geoResult2.rows[0].id;
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
      await db.query(
        "INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)",
        [userBId, userAId],
      );
      const result = await searchDirectory(userAId, {});
      const userIds = result.entries.map((e) => e.userId);
      expect(userIds).not.toContain(userBId);
    });

    it("should include hasNextPage in response", async () => {
      const result = await searchDirectory(userAId, {});
      expect(result.hasNextPage).toBe(false);
    });

    describe("text search (search)", () => {
      beforeEach(async () => {
        await db.query(
          "UPDATE user_profiles SET display_name = 'Bob Smith' WHERE user_id = $1",
          [userBId],
        );
        await db.query(
          "UPDATE user_profiles SET display_name = 'Carol Jones' WHERE user_id = $1",
          [userCId],
        );
      });

      it("should filter by display name prefix", async () => {
        const result = await searchDirectory(userAId, { search: "Bob" });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userBId);
      });

      it("should return no results for non-matching query", async () => {
        const result = await searchDirectory(userAId, { search: "xyzzy" });
        expect(result.entries).toHaveLength(0);
      });

      it("should be case-insensitive", async () => {
        const result = await searchDirectory(userAId, { search: "bob" });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userBId);
      });
    });

    describe("city filter", () => {
      it("should filter by city UUID", async () => {
        await db.query(
          "UPDATE user_profiles SET home_city_id = $1 WHERE user_id = $2",
          [geoId, userBId],
        );
        const result = await searchDirectory(userAId, { city: geoId });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userBId);
      });

      it("should return empty for city with no members", async () => {
        const result = await searchDirectory(userAId, { city: geoId2 });
        expect(result.entries).toHaveLength(0);
      });
    });

    describe("country filter", () => {
      it("should filter by country key", async () => {
        await db.query(
          "UPDATE user_profiles SET home_city_id = $1 WHERE user_id = $2",
          [geoId, userBId],
        );
        const result = await searchDirectory(userAId, { country: "united_kingdom" });
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].userId).toBe(userBId);
      });
    });

    describe("continent filter", () => {
      it("should filter by continent key", async () => {
        await db.query(
          "UPDATE user_profiles SET home_city_id = $1 WHERE user_id = $2",
          [geoId, userBId],
        );
        await db.query(
          "UPDATE user_profiles SET home_city_id = $1 WHERE user_id = $2",
          [geoId2, userCId],
        );
        // Both are in Europe
        const result = await searchDirectory(userAId, { continent: "europe" });
        expect(result.entries).toHaveLength(2);
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
        expect(bobEntry?.relationshipStatus).toBe("none");
      });

      it("should show 'following' when viewer follows member", async () => {
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userAId, userBId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.relationshipStatus).toBe("following");
      });

      it("should show 'follows_me' when member follows viewer", async () => {
        await db.query(
          "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)",
          [userBId, userAId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.relationshipStatus).toBe("follows_me");
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
        expect(bobEntry?.relationshipStatus).toBe("friend");
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

      it("should filter to followers", async () => {
        const result = await searchDirectory(userAId, { relationship: "followers" });
        const ids = result.entries.map((e) => e.userId);
        expect(ids).toContain(userBId);
      });
    });

    describe("blocked relationship filter", () => {
      it("should show blocked users when filtered", async () => {
        await db.query(
          "INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)",
          [userAId, userBId],
        );
        const result = await searchDirectory(userAId, { relationship: "blocked" });
        const ids = result.entries.map((e) => e.userId);
        expect(ids).toContain(userBId);
        expect(ids).not.toContain(userCId);
      });
    });

    describe("sort modes", () => {
      beforeEach(async () => {
        await db.query(
          "UPDATE user_profiles SET display_name = 'Zara' WHERE user_id = $1",
          [userBId],
        );
        await db.query(
          "UPDATE user_profiles SET display_name = 'Alice Jr' WHERE user_id = $1",
          [userCId],
        );
      });

      it("should sort alphabetically by default", async () => {
        const result = await searchDirectory(userAId, {});
        expect(result.entries[0].displayName).toBe("Alice Jr");
        expect(result.entries[1].displayName).toBe("Zara");
      });

      it("should sort by recent (newest first)", async () => {
        const result = await searchDirectory(userAId, { sort: "recent" });
        // Carol was created after Bob, so should appear first
        expect(result.entries[0].userId).toBe(userCId);
        expect(result.entries[1].userId).toBe(userBId);
      });
    });

    describe("cursor pagination", () => {
      it("should paginate with cursor", async () => {
        const page1 = await searchDirectory(userAId, { pageSize: 1 });
        expect(page1.entries).toHaveLength(1);
        expect(page1.nextCursor).not.toBeNull();
        expect(page1.hasNextPage).toBe(true);

        const page2 = await searchDirectory(userAId, {
          pageSize: 1,
          cursor: page1.nextCursor!,
        });
        expect(page2.entries).toHaveLength(1);
        expect(page2.entries[0].userId).not.toBe(page1.entries[0].userId);
        expect(page2.nextCursor).toBeNull();
        expect(page2.hasNextPage).toBe(false);
      });

      it("should return null nextCursor when no more pages", async () => {
        const result = await searchDirectory(userAId, { pageSize: 100 });
        expect(result.nextCursor).toBeNull();
        expect(result.hasNextPage).toBe(false);
      });
    });

    describe("social link visibility", () => {
      it("should filter social links by relationship level", async () => {
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
        expect(bobEntry?.visibleSocialLinks).toHaveLength(1);
        expect(bobEntry?.visibleSocialLinks[0].platform).toBe("instagram");
      });

      it("should return only platform and url in visible links", async () => {
        await db.query(
          "INSERT INTO social_links (user_id, platform, url, visibility) VALUES ($1, 'instagram', 'https://ig.com/bob', 'everyone')",
          [userBId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        const link = bobEntry?.visibleSocialLinks[0];
        expect(link).toHaveProperty("platform");
        expect(link).toHaveProperty("url");
        expect(link).not.toHaveProperty("id");
        expect(link).not.toHaveProperty("visibility");
      });
    });

    describe("entry fields", () => {
      it("should include homeCity and homeCountry from geography", async () => {
        await db.query(
          "UPDATE user_profiles SET home_city_id = $1 WHERE user_id = $2",
          [geoId, userBId],
        );
        const result = await searchDirectory(userAId, {});
        const bobEntry = result.entries.find((e) => e.userId === userBId);
        expect(bobEntry?.homeCity).toBe("London");
        expect(bobEntry?.homeCountry).toBe("United Kingdom");
      });

      it("should include profile id", async () => {
        const result = await searchDirectory(userAId, {});
        const entry = result.entries[0];
        expect(entry.id).toBeDefined();
        expect(typeof entry.id).toBe("string");
      });

      it("should include createdAt", async () => {
        const result = await searchDirectory(userAId, {});
        const entry = result.entries[0];
        expect(entry.createdAt).toBeDefined();
      });

      it("should not include profileCompleteness in entry", async () => {
        const result = await searchDirectory(userAId, {});
        const entry = result.entries[0] as unknown as Record<string, unknown>;
        expect(entry).not.toHaveProperty("profileCompleteness");
      });
    });

    describe("verified teacher filter", () => {
      it("should filter to verified teachers only", async () => {
        await db.query(
          `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
           VALUES ($1, '{}', 'verified')`,
          [userBId],
        );
        const result = await searchDirectory(userAId, { teachersOnly: true });
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

    describe("mute does not affect directory", () => {
      it("muted users should still appear in directory results", async () => {
        await db.query(
          "INSERT INTO mutes (muter_id, muted_id) VALUES ($1, $2)",
          [userAId, userBId],
        );
        const result = await searchDirectory(userAId, {});
        const ids = result.entries.map((e) => e.userId);
        expect(ids).toContain(userBId);
      });
    });

    describe("T027: full visibility cycle", () => {
      it("user defaults hidden, appears after opt-in, disappears after opt-out", async () => {
        // Dave has not opted in — not in directory
        const before = await searchDirectory(userAId, {});
        expect(before.entries.map((e) => e.userId)).not.toContain(userDId);

        // Dave opts in
        await setDirectoryVisibility(userDId, true);
        const visible = await searchDirectory(userAId, {});
        expect(visible.entries.map((e) => e.userId)).toContain(userDId);

        // Dave opts out
        await setDirectoryVisibility(userDId, false);
        const hidden = await searchDirectory(userAId, {});
        expect(hidden.entries.map((e) => e.userId)).not.toContain(userDId);
      });
    });

    describe("T028a: direct profile access when directory_visible=false", () => {
      it("getProfile returns data even for directory-hidden users", async () => {
        // Dave never opted in (directory_visible=false)
        const profile = await getProfile(userDId, userAId);
        expect(profile).not.toBeNull();
        expect(profile!.userId).toBe(userDId);
      });

      it("getProfile returns data after user explicitly opts out", async () => {
        await setDirectoryVisibility(userBId, false);
        const profile = await getProfile(userBId, userAId);
        expect(profile).not.toBeNull();
        expect(profile!.userId).toBe(userBId);
      });
    });

    describe("T028b: directoryVisible via upsertProfile", () => {
      it("upsertProfile sets directory_visible to true", async () => {
        await upsertProfile(userDId, { directoryVisible: true });
        const visible = await getDirectoryVisibility(userDId);
        expect(visible).toBe(true);
      });

      it("upsertProfile sets directory_visible to false", async () => {
        await setDirectoryVisibility(userDId, true);
        await upsertProfile(userDId, { directoryVisible: false });
        const visible = await getDirectoryVisibility(userDId);
        expect(visible).toBe(false);
      });

      it("upsertProfile updates other fields without affecting directory_visible", async () => {
        await setDirectoryVisibility(userDId, true);
        await upsertProfile(userDId, { displayName: "Dave Updated" });
        const visible = await getDirectoryVisibility(userDId);
        expect(visible).toBe(true);
      });
    });
  });
});
