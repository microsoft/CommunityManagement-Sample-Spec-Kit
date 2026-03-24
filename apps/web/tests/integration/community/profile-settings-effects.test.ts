/**
 * Integration tests: Profile and Settings effects
 *
 * Ensures that profile and settings changes have the correct downstream effects:
 *  - Updating display name, bio, avatar, default role, and home city is reflected in getMyProfile
 *  - Toggling directory visibility shows/hides the user in searchDirectory
 *  - Social link changes are reflected in getProfile (with correct visibility gating)
 *  - Profile completeness score changes when fields are added/removed
 *  - upsertProfile with directoryVisible flag controls directory inclusion
 *  - setSocialLinks replaces all links (not just appends)
 *  - getProfile auto-creates a profile for a user with no existing profile row
 *  - detectHomeCity assigns the correct closest city
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  getMyProfile,
  getProfile,
  upsertProfile,
  setSocialLinks,
  detectHomeCity,
} from "@/lib/profiles/service";
import { searchDirectory, setDirectoryVisibility, getDirectoryVisibility } from "@/lib/directory/service";
import { computeProfileCompleteness } from "@/lib/directory/completeness";
import fs from "fs";
import path from "path";

let db: PGlite;
let aliceId: string;
let bobId: string;
let cityId: string;
let city2Id: string;

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

describe("Profile and Settings effects", () => {
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

    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')",
    );
    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000002', 'France', 'FR', 'EU')",
    );
    const c1 = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5074, -0.1278, 'Europe/London') RETURNING id",
    );
    cityId = c1.rows[0].id;

    const c2 = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('Paris', 'paris', '00000000-0000-0000-0000-000000000002', 48.8566, 2.3522, 'Europe/Paris') RETURNING id",
    );
    city2Id = c2.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("upsertProfile: field updates", () => {
    it("first call auto-creates the profile row", async () => {
      const profile = await upsertProfile(aliceId, { displayName: "Alice D" });
      expect(profile.userId).toBe(aliceId);
      expect(profile.displayName).toBe("Alice D");
    });

    it("updating display name is reflected in getMyProfile", async () => {
      await upsertProfile(aliceId, { displayName: "Alice Old" });
      await upsertProfile(aliceId, { displayName: "Alice New" });
      const profile = await getMyProfile(aliceId);
      expect(profile.displayName).toBe("Alice New");
    });

    it("updating bio does not overwrite display name", async () => {
      await upsertProfile(aliceId, { displayName: "Alice" });
      await upsertProfile(aliceId, { bio: "I love acro!" });
      const profile = await getMyProfile(aliceId);
      expect(profile.displayName).toBe("Alice");
      expect(profile.bio).toBe("I love acro!");
    });

    it("setting avatarUrl is reflected in profile", async () => {
      await upsertProfile(aliceId, { avatarUrl: "https://cdn.example.com/alice.png" });
      const profile = await getMyProfile(aliceId);
      expect(profile.avatarUrl).toBe("https://cdn.example.com/alice.png");
    });

    it("changing defaultRole is reflected in profile", async () => {
      await upsertProfile(aliceId, { defaultRole: "flyer" });
      const profile1 = await getMyProfile(aliceId);
      expect(profile1.defaultRole).toBe("flyer");

      await upsertProfile(aliceId, { defaultRole: "base" });
      const profile2 = await getMyProfile(aliceId);
      expect(profile2.defaultRole).toBe("base");
    });

    it("setting homeCityId is reflected in profile with city name", async () => {
      await upsertProfile(aliceId, { homeCityId: cityId });
      const profile = await getMyProfile(aliceId);
      expect(profile.homeCityId).toBe(cityId);
      expect(profile.homeCityName).toBe("London");
    });

    it("changing home city updates homeCityName", async () => {
      await upsertProfile(aliceId, { homeCityId: cityId });
      await upsertProfile(aliceId, { homeCityId: city2Id });
      const profile = await getMyProfile(aliceId);
      expect(profile.homeCityName).toBe("Paris");
    });

    it("empty upsert on non-existent profile creates a blank profile", async () => {
      const profile = await upsertProfile(aliceId, {});
      expect(profile.userId).toBe(aliceId);
      expect(profile.displayName).toBeNull();
    });
  });

  describe("getMyProfile: auto-creation", () => {
    it("getMyProfile auto-creates profile for new user", async () => {
      const profile = await getMyProfile(aliceId);
      expect(profile.userId).toBe(aliceId);
      expect(profile.displayName).toBeNull();
      expect(profile.socialLinks).toEqual([]);
    });

    it("getMyProfile returns same profile on repeated calls", async () => {
      const p1 = await getMyProfile(aliceId);
      const p2 = await getMyProfile(aliceId);
      expect(p1.userId).toBe(p2.userId);
    });
  });

  describe("setSocialLinks: full replacement", () => {
    it("setSocialLinks replaces all previous links", async () => {
      await setSocialLinks(aliceId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
        { platform: "youtube", url: "https://youtube.com/@alice", visibility: "followers" },
      ]);

      await setSocialLinks(aliceId, [
        { platform: "facebook", url: "https://facebook.com/alice", visibility: "friends" },
      ]);

      const profile = await getMyProfile(aliceId);
      expect(profile.socialLinks).toHaveLength(1);
      expect(profile.socialLinks[0].platform).toBe("facebook");
    });

    it("setSocialLinks with empty array removes all links", async () => {
      await setSocialLinks(aliceId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
      ]);
      await setSocialLinks(aliceId, []);
      const profile = await getMyProfile(aliceId);
      expect(profile.socialLinks).toHaveLength(0);
    });

    it("social link changes are visible in getProfile for correct relationship", async () => {
      // Ensure profile row exists before setting social links
      await upsertProfile(aliceId, {});
      await setSocialLinks(aliceId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
      ]);
      const before = await getProfile(aliceId, bobId);
      expect(before!.socialLinks).toHaveLength(1);

      // Now Alice makes it friends-only
      await setSocialLinks(aliceId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "friends" },
      ]);
      const after = await getProfile(aliceId, bobId);
      // Bob is a stranger — cannot see friends-only link
      expect(after!.socialLinks).toHaveLength(0);
    });
  });

  describe("directory visibility setting effects", () => {
    it("user is hidden by default", async () => {
      const visible = await getDirectoryVisibility(aliceId);
      expect(visible).toBe(false);
    });

    it("setDirectoryVisibility(true) makes user appear in directory", async () => {
      await setDirectoryVisibility(aliceId, true);
      await setDirectoryVisibility(bobId, true);

      const result = await searchDirectory(bobId, {});
      const ids = result.entries.map((e) => e.userId);
      expect(ids).toContain(aliceId);
    });

    it("setDirectoryVisibility(false) hides user from directory", async () => {
      await setDirectoryVisibility(aliceId, true);
      await setDirectoryVisibility(bobId, true);

      await setDirectoryVisibility(aliceId, false);
      const result = await searchDirectory(bobId, {});
      const ids = result.entries.map((e) => e.userId);
      expect(ids).not.toContain(aliceId);
    });

    it("toggling on and off twice leaves user hidden", async () => {
      await setDirectoryVisibility(aliceId, true);
      await setDirectoryVisibility(aliceId, false);
      await setDirectoryVisibility(aliceId, true);
      await setDirectoryVisibility(aliceId, false);

      const visible = await getDirectoryVisibility(aliceId);
      expect(visible).toBe(false);

      await setDirectoryVisibility(bobId, true);
      const result = await searchDirectory(bobId, {});
      expect(result.entries.map((e) => e.userId)).not.toContain(aliceId);
    });

    it("upsertProfile with directoryVisible=true is equivalent to setDirectoryVisibility(true)", async () => {
      await upsertProfile(aliceId, { directoryVisible: true });
      const visible = await getDirectoryVisibility(aliceId);
      expect(visible).toBe(true);
    });

    it("upsertProfile with directoryVisible=false hides user", async () => {
      await setDirectoryVisibility(aliceId, true);
      await upsertProfile(aliceId, { directoryVisible: false });
      const visible = await getDirectoryVisibility(aliceId);
      expect(visible).toBe(false);
    });

    it("updating profile fields without directoryVisible does not affect visibility", async () => {
      await setDirectoryVisibility(aliceId, true);
      await upsertProfile(aliceId, { displayName: "Alice Updated" });
      const visible = await getDirectoryVisibility(aliceId);
      expect(visible).toBe(true);
    });
  });

  describe("profile completeness score effects", () => {
    it("blank profile has low completeness", () => {
      const score = computeProfileCompleteness({
        displayName: null,
        bio: null,
        avatarUrl: null,
        homeCityId: null,
        socialLinksCount: 0,
      });
      expect(score.percentage).toBeLessThan(30);
    });

    it("completeness increases when display name is added", () => {
      const blank = computeProfileCompleteness({ displayName: null, bio: null, avatarUrl: null, homeCityId: null, socialLinksCount: 0 });
      const withName = computeProfileCompleteness({ displayName: "Alice", bio: null, avatarUrl: null, homeCityId: null, socialLinksCount: 0 });
      expect(withName.percentage).toBeGreaterThan(blank.percentage);
    });

    it("completeness increases when bio is added", () => {
      const withName = computeProfileCompleteness({ displayName: "Alice", bio: null, avatarUrl: null, homeCityId: null, socialLinksCount: 0 });
      const withNameAndBio = computeProfileCompleteness({ displayName: "Alice", bio: "Bio here", avatarUrl: null, homeCityId: null, socialLinksCount: 0 });
      expect(withNameAndBio.percentage).toBeGreaterThan(withName.percentage);
    });

    it("completeness increases when avatar is added", () => {
      const noAvatar = computeProfileCompleteness({ displayName: "Alice", bio: "Bio", avatarUrl: null, homeCityId: null, socialLinksCount: 0 });
      const withAvatar = computeProfileCompleteness({ displayName: "Alice", bio: "Bio", avatarUrl: "https://cdn.example.com/a.png", homeCityId: null, socialLinksCount: 0 });
      expect(withAvatar.percentage).toBeGreaterThan(noAvatar.percentage);
    });

    it("fully completed profile has 100% completeness", () => {
      const score = computeProfileCompleteness({
        displayName: "Alice",
        bio: "I love acro!",
        avatarUrl: "https://cdn.example.com/a.png",
        homeCityId: cityId,
        socialLinksCount: 1,
      });
      expect(score.percentage).toBe(100);
    });

    it("all fields true gives all fields as true in result", () => {
      const score = computeProfileCompleteness({
        displayName: "Alice",
        bio: "Bio",
        avatarUrl: "https://cdn.example.com/a.png",
        homeCityId: cityId,
        socialLinksCount: 1,
      });
      expect(score.fields.displayName).toBe(true);
      expect(score.fields.bio).toBe(true);
      expect(score.fields.avatar).toBe(true);
      expect(score.fields.homeCity).toBe(true);
      expect(score.fields.socialLink).toBe(true);
    });

    it("blank profile has all fields false", () => {
      const score = computeProfileCompleteness({ displayName: null, bio: null, avatarUrl: null, homeCityId: null, socialLinksCount: 0 });
      expect(score.fields.displayName).toBe(false);
      expect(score.fields.bio).toBe(false);
      expect(score.fields.avatar).toBe(false);
      expect(score.fields.homeCity).toBe(false);
      expect(score.fields.socialLink).toBe(false);
    });
  });

  describe("detectHomeCity", () => {
    it("returns London for coordinates near London", async () => {
      const result = await detectHomeCity(51.51, -0.13);
      expect(result.cityId).toBe(cityId);
      expect(result.cityName).toBe("London");
    });

    it("returns Paris for coordinates near Paris", async () => {
      const result = await detectHomeCity(48.85, 2.35);
      expect(result.cityId).toBe(city2Id);
      expect(result.cityName).toBe("Paris");
    });

    it("returns null for a location far from any city", async () => {
      const result = await detectHomeCity(0, 0);
      expect(result.cityId).toBeNull();
    });
  });

  describe("getProfile: visibility and access", () => {
    it("returns correct displayName after upsert", async () => {
      await upsertProfile(aliceId, { displayName: "Alice Pro" });
      const profile = await getProfile(aliceId, bobId);
      expect(profile!.displayName).toBe("Alice Pro");
    });

    it("returns null when viewer has blocked the profile owner", async () => {
      await upsertProfile(aliceId, { displayName: "Alice" });
      await db.query(
        "INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)",
        [bobId, aliceId],
      );
      const profile = await getProfile(aliceId, bobId);
      expect(profile).toBeNull();
    });

    it("returns null for non-existent user", async () => {
      const profile = await getProfile("00000000-0000-0000-0000-999999999999", bobId);
      expect(profile).toBeNull();
    });

    it("auto-creates profile for user with no profile row", async () => {
      const profile = await getProfile(aliceId, bobId);
      expect(profile).not.toBeNull();
      expect(profile!.userId).toBe(aliceId);
    });

    it("returns relationship 'self' when viewer is profile owner", async () => {
      const profile = await getProfile(aliceId, aliceId);
      expect(profile!.relationship).toBe("self");
    });
  });
});
