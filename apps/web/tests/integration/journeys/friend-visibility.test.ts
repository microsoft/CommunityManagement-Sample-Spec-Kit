/**
 * Journey tests: Friend visibility
 *
 * Ensures that:
 *  - Mutual follows correctly form a "friend" relationship
 *  - Friends can see friend-level social links; followers see follower-level; strangers see only public
 *  - getFriends returns the correct list
 *  - Unfollowing breaks the friendship and reverts social link visibility
 *  - getRelationship returns the right value at each stage of the follow lifecycle
 *  - Friends appear correctly in directory with "friend" relationship status
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  follow,
  unfollow,
  getFollowers,
  getFollowing,
  getFriends,
} from "@/lib/follows/service";
import { getRelationship } from "@/lib/follows/relationship";
import { getProfile, upsertProfile, setSocialLinks } from "@/lib/profiles/service";
import { filterSocialLinks } from "@/lib/profiles/visibility";
import { searchDirectory, setDirectoryVisibility } from "@/lib/directory/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let aliceId: string;
let bobId: string;
let carolId: string;
let daveId: string;

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

describe("Friend visibility journeys", () => {
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
    const r4 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('dave@test.com', 'Dave') RETURNING id",
    );
    daveId = r4.rows[0].id;

    // Create profiles
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Alice')", [aliceId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Bob')", [bobId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Carol')", [carolId]);
    await db.query("INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Dave')", [daveId]);
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("relationship progression", () => {
    it("relationship is 'none' before any follows", async () => {
      expect(await getRelationship(aliceId, bobId)).toBe("none");
      expect(await getRelationship(bobId, aliceId)).toBe("none");
    });

    it("relationship is 'following' after Alice follows Bob", async () => {
      await follow(aliceId, bobId);
      expect(await getRelationship(aliceId, bobId)).toBe("following");
    });

    it("relationship is 'follower' for Bob's perspective when Alice follows Bob", async () => {
      await follow(aliceId, bobId);
      expect(await getRelationship(bobId, aliceId)).toBe("follower");
    });

    it("relationship becomes 'friend' after mutual follow", async () => {
      await follow(aliceId, bobId);
      const result = await follow(bobId, aliceId);
      expect(result.becameFriends).toBe(true);
      expect(await getRelationship(aliceId, bobId)).toBe("friend");
      expect(await getRelationship(bobId, aliceId)).toBe("friend");
    });

    it("follow returns becameFriends=false for non-mutual follow", async () => {
      const result = await follow(aliceId, bobId);
      expect(result.becameFriends).toBe(false);
    });

    it("relationship reverts to 'follower' after one side unfollows", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);
      // Alice unfollows
      await unfollow(aliceId, bobId);
      expect(await getRelationship(aliceId, bobId)).toBe("follower");
      expect(await getRelationship(bobId, aliceId)).toBe("following");
    });

    it("relationship returns 'none' after both sides unfollow", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);
      await unfollow(aliceId, bobId);
      await unfollow(bobId, aliceId);
      expect(await getRelationship(aliceId, bobId)).toBe("none");
    });

    it("relationship returns 'self' when querying yourself", async () => {
      expect(await getRelationship(aliceId, aliceId)).toBe("self");
    });

    it("relationship returns 'none' for null viewer", async () => {
      expect(await getRelationship(null, aliceId)).toBe("none");
    });
  });

  describe("friend lists", () => {
    it("getFriends returns both mutual followers", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);
      await follow(aliceId, carolId); // one-way

      const aliceFriends = await getFriends(aliceId);
      expect(aliceFriends.total).toBe(1);
      expect(aliceFriends.entries[0].userId).toBe(bobId);
    });

    it("getFriends returns empty when no mutual follows", async () => {
      await follow(aliceId, bobId);
      const result = await getFriends(aliceId);
      expect(result.total).toBe(0);
    });

    it("getFriends includes multiple friends", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);
      await follow(aliceId, carolId);
      await follow(carolId, aliceId);

      const result = await getFriends(aliceId);
      expect(result.total).toBe(2);
      const ids = result.entries.map((e) => e.userId);
      expect(ids).toContain(bobId);
      expect(ids).toContain(carolId);
    });

    it("getFollowers returns correct list", async () => {
      await follow(bobId, aliceId);
      await follow(carolId, aliceId);
      const result = await getFollowers(aliceId, aliceId);
      expect(result.total).toBe(2);
    });

    it("getFollowing returns correct list", async () => {
      await follow(aliceId, bobId);
      await follow(aliceId, carolId);
      const result = await getFollowing(aliceId, aliceId);
      expect(result.total).toBe(2);
    });
  });

  describe("social link visibility by relationship", () => {
    const makeLink = (
      id: string,
      userId: string,
      visibility: "everyone" | "followers" | "friends" | "hidden",
    ) => ({
      id,
      userId,
      platform: "instagram" as const,
      url: `https://instagram.com/${userId}`,
      visibility,
    });

    it("stranger sees only 'everyone' links", () => {
      const links = [
        makeLink("1", aliceId, "everyone"),
        makeLink("2", aliceId, "followers"),
        makeLink("3", aliceId, "friends"),
        makeLink("4", aliceId, "hidden"),
      ];
      const visible = filterSocialLinks(links, "none");
      expect(visible).toHaveLength(1);
      expect(visible[0].visibility).toBe("everyone");
    });

    it("follower sees 'everyone' and 'followers' links", () => {
      const links = [
        makeLink("1", aliceId, "everyone"),
        makeLink("2", aliceId, "followers"),
        makeLink("3", aliceId, "friends"),
        makeLink("4", aliceId, "hidden"),
      ];
      const visible = filterSocialLinks(links, "follower");
      expect(visible).toHaveLength(2);
      const visibilities = visible.map((l) => l.visibility);
      expect(visibilities).toContain("everyone");
      expect(visibilities).toContain("followers");
      expect(visibilities).not.toContain("friends");
    });

    it("friend sees 'everyone', 'followers', and 'friends' links", () => {
      const links = [
        makeLink("1", aliceId, "everyone"),
        makeLink("2", aliceId, "followers"),
        makeLink("3", aliceId, "friends"),
        makeLink("4", aliceId, "hidden"),
      ];
      const visible = filterSocialLinks(links, "friend");
      expect(visible).toHaveLength(3);
      const visibilities = visible.map((l) => l.visibility);
      expect(visibilities).not.toContain("hidden");
    });

    it("self sees all links including hidden", () => {
      const links = [
        makeLink("1", aliceId, "everyone"),
        makeLink("2", aliceId, "followers"),
        makeLink("3", aliceId, "friends"),
        makeLink("4", aliceId, "hidden"),
      ];
      const visible = filterSocialLinks(links, "self");
      expect(visible).toHaveLength(4);
    });
  });

  describe("profile access with social link visibility gating", () => {
    beforeEach(async () => {
      await setSocialLinks(aliceId, [
        { platform: "instagram", url: "https://instagram.com/alice", visibility: "everyone" },
        { platform: "youtube", url: "https://youtube.com/@alice", visibility: "followers" },
        { platform: "facebook", url: "https://facebook.com/alice", visibility: "friends" },
      ]);
    });

    it("stranger Bob sees only the public Instagram link", async () => {
      const profile = await getProfile(aliceId, bobId);
      expect(profile).not.toBeNull();
      const links = profile!.socialLinks;
      expect(links).toHaveLength(1);
      expect(links[0].platform).toBe("instagram");
    });

    it("follower Bob sees Instagram and YouTube links", async () => {
      await follow(bobId, aliceId); // Bob follows Alice → Bob is a follower of Alice
      const profile = await getProfile(aliceId, bobId);
      expect(profile).not.toBeNull();
      const platforms = profile!.socialLinks.map((l) => l.platform);
      expect(platforms).toContain("instagram");
      expect(platforms).toContain("youtube");
      expect(platforms).not.toContain("facebook");
    });

    it("friend Bob sees all three links", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId); // mutual = friends
      const profile = await getProfile(aliceId, bobId);
      expect(profile).not.toBeNull();
      const platforms = profile!.socialLinks.map((l) => l.platform);
      expect(platforms).toContain("instagram");
      expect(platforms).toContain("youtube");
      expect(platforms).toContain("facebook");
    });

    it("Alice sees all her own links", async () => {
      const profile = await getProfile(aliceId, aliceId);
      expect(profile).not.toBeNull();
      expect(profile!.socialLinks).toHaveLength(3);
    });
  });

  describe("directory search relationship status", () => {
    beforeEach(async () => {
      await setDirectoryVisibility(aliceId, true);
      await setDirectoryVisibility(bobId, true);
      await setDirectoryVisibility(carolId, true);
      await setDirectoryVisibility(daveId, true);
    });

    it("shows 'none' for strangers", async () => {
      const result = await searchDirectory(aliceId, {});
      const bobEntry = result.entries.find((e) => e.userId === bobId);
      expect(bobEntry?.relationshipStatus).toBe("none");
    });

    it("shows 'following' when Alice follows Bob", async () => {
      await follow(aliceId, bobId);
      const result = await searchDirectory(aliceId, {});
      const bobEntry = result.entries.find((e) => e.userId === bobId);
      expect(bobEntry?.relationshipStatus).toBe("following");
    });

    it("shows 'follows_me' when Bob follows Alice", async () => {
      await follow(bobId, aliceId);
      const result = await searchDirectory(aliceId, {});
      const bobEntry = result.entries.find((e) => e.userId === bobId);
      expect(bobEntry?.relationshipStatus).toBe("follows_me");
    });

    it("shows 'friend' for mutual follows", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);
      const result = await searchDirectory(aliceId, {});
      const bobEntry = result.entries.find((e) => e.userId === bobId);
      expect(bobEntry?.relationshipStatus).toBe("friend");
    });

    it("directory relationship filter 'friends' shows only mutual follows", async () => {
      await follow(aliceId, bobId);
      await follow(bobId, aliceId); // mutual
      await follow(aliceId, carolId); // one-way

      const result = await searchDirectory(aliceId, { relationship: "friends" });
      const ids = result.entries.map((e) => e.userId);
      expect(ids).toContain(bobId);
      expect(ids).not.toContain(carolId);
    });

    it("directory relationship filter 'following' shows users Alice follows", async () => {
      await follow(aliceId, bobId);
      const result = await searchDirectory(aliceId, { relationship: "following" });
      const ids = result.entries.map((e) => e.userId);
      expect(ids).toContain(bobId);
      expect(ids).not.toContain(carolId);
    });

    it("directory social link visibility: friend sees friend-level links in directory", async () => {
      await db.query(
        "INSERT INTO social_links (user_id, platform, url, visibility) VALUES ($1, 'instagram', 'https://ig.com/bob', 'friends')",
        [bobId],
      );
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);

      const result = await searchDirectory(aliceId, {});
      const bobEntry = result.entries.find((e) => e.userId === bobId);
      expect(bobEntry?.visibleSocialLinks).toHaveLength(1);
      expect(bobEntry?.visibleSocialLinks[0].platform).toBe("instagram");
    });

    it("directory social link visibility: stranger does not see friend-level links", async () => {
      await db.query(
        "INSERT INTO social_links (user_id, platform, url, visibility) VALUES ($1, 'instagram', 'https://ig.com/bob', 'friends')",
        [bobId],
      );
      const result = await searchDirectory(aliceId, {});
      const bobEntry = result.entries.find((e) => e.userId === bobId);
      expect(bobEntry?.visibleSocialLinks).toHaveLength(0);
    });
  });

  describe("follow edge cases", () => {
    it("cannot follow yourself", async () => {
      await expect(follow(aliceId, aliceId)).rejects.toThrow("Cannot follow yourself");
    });

    it("duplicate follow returns followed=false", async () => {
      await follow(aliceId, bobId);
      const result = await follow(aliceId, bobId);
      expect(result.followed).toBe(false);
    });

    it("unfollow returns false when not following", async () => {
      const result = await unfollow(aliceId, bobId);
      expect(result).toBe(false);
    });

    it("four users in various states have correct relationships", async () => {
      // Alice <-> Bob: friends
      await follow(aliceId, bobId);
      await follow(bobId, aliceId);
      // Alice -> Carol: following
      await follow(aliceId, carolId);
      // Dave -> Alice: follower for Alice

      await follow(daveId, aliceId);

      expect(await getRelationship(aliceId, bobId)).toBe("friend");
      expect(await getRelationship(aliceId, carolId)).toBe("following");
      expect(await getRelationship(aliceId, daveId)).toBe("follower");
      expect(await getRelationship(carolId, aliceId)).toBe("follower");
      expect(await getRelationship(daveId, aliceId)).toBe("following");
    });
  });
});
