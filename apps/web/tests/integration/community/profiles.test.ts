import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { getMyProfile, getProfile, upsertProfile, setSocialLinks, detectHomeCity } from "@/lib/profiles/service";
import { filterSocialLinks } from "@/lib/profiles/visibility";
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

describe("Profile Service", () => {
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

    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')",
    );
    const cityResult = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5074, -0.1278, 'Europe/London') RETURNING id",
    );
    cityId = cityResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("getMyProfile", () => {
    it("should auto-create profile on first access", async () => {
      const profile = await getMyProfile(userAId);
      expect(profile.userId).toBe(userAId);
      expect(profile.displayName).toBeNull();
      expect(profile.bio).toBeNull();
      expect(profile.socialLinks).toEqual([]);
    });

    it("should return existing profile on subsequent access", async () => {
      await upsertProfile(userAId, { displayName: "Alice D" });
      const profile = await getMyProfile(userAId);
      expect(profile.displayName).toBe("Alice D");
    });

    it("should include home city name when set", async () => {
      await upsertProfile(userAId, { homeCityId: cityId });
      const profile = await getMyProfile(userAId);
      expect(profile.homeCityName).toBe("London");
    });
  });

  describe("upsertProfile", () => {
    it("should create profile with display name", async () => {
      const profile = await upsertProfile(userAId, { displayName: "Alice Dancer" });
      expect(profile.displayName).toBe("Alice Dancer");
    });

    it("should update bio on existing profile", async () => {
      await upsertProfile(userAId, { displayName: "Alice" });
      const updated = await upsertProfile(userAId, { bio: "I love dancing!" });
      expect(updated.bio).toBe("I love dancing!");
      expect(updated.displayName).toBe("Alice");
    });

    it("should set default role", async () => {
      const profile = await upsertProfile(userAId, { defaultRole: "flyer" });
      expect(profile.defaultRole).toBe("flyer");
    });

    it("should set avatar URL", async () => {
      const profile = await upsertProfile(userAId, { avatarUrl: "https://example.com/avatar.png" });
      expect(profile.avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("should set home city ID", async () => {
      const profile = await upsertProfile(userAId, { homeCityId: cityId });
      expect(profile.homeCityId).toBe(cityId);
    });

    it("should handle empty update on non-existent profile", async () => {
      const profile = await upsertProfile(userAId, {});
      expect(profile.userId).toBe(userAId);
    });
  });

  describe("setSocialLinks", () => {
    it("should set social links for user", async () => {
      const links = await setSocialLinks(userAId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
        { platform: "youtube", url: "https://youtube.com/@alice", visibility: "friends" },
      ]);
      expect(links).toHaveLength(2);
      expect(links[0].platform).toBe("instagram");
      expect(links[1].platform).toBe("youtube");
    });

    it("should replace existing links on re-set", async () => {
      await setSocialLinks(userAId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
      ]);
      const replaced = await setSocialLinks(userAId, [
        { platform: "youtube", url: "https://youtube.com/@alice", visibility: "friends" },
      ]);
      expect(replaced).toHaveLength(1);
      expect(replaced[0].platform).toBe("youtube");

      // Verify old link is gone
      const profile = await getMyProfile(userAId);
      expect(profile.socialLinks).toHaveLength(1);
      expect(profile.socialLinks[0].platform).toBe("youtube");
    });
  });

  describe("getProfile (public view)", () => {
    it("should return profile for another user", async () => {
      await upsertProfile(userAId, { displayName: "Alice" });
      const profile = await getProfile(userAId, userBId);
      expect(profile).not.toBeNull();
      expect(profile!.displayName).toBe("Alice");
      expect(profile!.relationship).toBe("none");
    });

    it("should return null for blocked user", async () => {
      await upsertProfile(userAId, { displayName: "Alice" });
      await db.query(
        "INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)",
        [userBId, userAId],
      );
      const profile = await getProfile(userAId, userBId);
      expect(profile).toBeNull();
    });

    it("should return null for non-existent user", async () => {
      const profile = await getProfile("00000000-0000-0000-0000-999999999999", userBId);
      expect(profile).toBeNull();
    });

    it("should auto-create profile if user exists but profile does not", async () => {
      const profile = await getProfile(userAId, userBId);
      expect(profile).not.toBeNull();
      expect(profile!.displayName).toBeNull();
    });
  });

  describe("detectHomeCity", () => {
    it("should detect nearest city within 100km", async () => {
      const result = await detectHomeCity(51.51, -0.13);
      expect(result.cityId).toBe(cityId);
      expect(result.cityName).toBe("London");
      expect(result.distance).toBeLessThan(100);
    });

    it("should return null for location far from any city", async () => {
      const result = await detectHomeCity(0, 0);
      expect(result.cityId).toBeNull();
    });
  });

  describe("filterSocialLinks (visibility)", () => {
    const makeLink = (visibility: "everyone" | "followers" | "friends" | "hidden") => ({
      id: "test-id",
      userId: "test-user",
      platform: "instagram" as const,
      url: "https://instagram.com/test",
      visibility,
    });

    it("should show all links to self", () => {
      const links = [makeLink("everyone"), makeLink("followers"), makeLink("friends"), makeLink("hidden")];
      expect(filterSocialLinks(links, "self")).toHaveLength(4);
    });

    it("should show everyone+followers+friends links to friends", () => {
      const links = [makeLink("everyone"), makeLink("followers"), makeLink("friends"), makeLink("hidden")];
      expect(filterSocialLinks(links, "friend")).toHaveLength(3);
    });

    it("should show everyone+followers links to followers", () => {
      const links = [makeLink("everyone"), makeLink("followers"), makeLink("friends"), makeLink("hidden")];
      expect(filterSocialLinks(links, "follower")).toHaveLength(2);
    });

    it("should show only everyone links to non-followers", () => {
      const links = [makeLink("everyone"), makeLink("followers"), makeLink("friends"), makeLink("hidden")];
      expect(filterSocialLinks(links, "none")).toHaveLength(1);
    });
  });
});
