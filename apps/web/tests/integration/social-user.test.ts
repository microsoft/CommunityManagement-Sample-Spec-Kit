/**
 * Integration tests for upsertSocialUser and getUserIdByOid
 * Spec: 011-entra-external-id
 * Phase 2 (T006) + Phase 3 (T010) + Phase 4 (T016, T017)
 *
 * Tests MUST FAIL before implementation (TDD — Constitution II).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { upsertSocialUser, getUserIdByOid } from "@/lib/auth/social-user";
import type { SocialUserProfile } from "@acroyoga/shared/types/auth";
import fs from "fs";
import path from "path";

let pg: PGlite;

async function applyMigrations(d: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../src/db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await d.exec(sql);
  }
}

const googleProfile: SocialUserProfile = {
  providerOid: "oid-google-001",
  provider: "google",
  email: "alice@gmail.com",
  displayName: "Alice Google",
  avatarUrl: "https://lh3.googleusercontent.com/alice.jpg",
};

const appleProfileNullEmail: SocialUserProfile = {
  providerOid: "oid-apple-002",
  provider: "apple",
  email: null,
  displayName: "Apple User",
  avatarUrl: null,
};

describe("upsertSocialUser", () => {
  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
  });

  afterEach(async () => {
    clearTestDb();
    await pg.close();
  });

  // T006: New user → inserts row in users table with correct fields
  it("inserts a new user row with correct social fields", async () => {
    const userId = await upsertSocialUser(googleProfile);

    expect(userId).toBeTruthy();
    expect(typeof userId).toBe("string");

    const result = await pg.query<{
      id: string;
      email: string;
      name: string;
      provider: string;
      provider_oid: string;
      avatar_url: string;
    }>(
      "SELECT id, email, name, provider, provider_oid, avatar_url FROM users WHERE id = $1",
      [userId],
    );
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.email).toBe("alice@gmail.com");
    expect(row.name).toBe("Alice Google");
    expect(row.provider).toBe("google");
    expect(row.provider_oid).toBe("oid-google-001");
    expect(row.avatar_url).toBe("https://lh3.googleusercontent.com/alice.jpg");
  });

  // T006: Existing user (same oid) → updates email, displayName, avatarUrl; no duplicate
  it("updates existing user on second upsert with same oid", async () => {
    const firstId = await upsertSocialUser(googleProfile);

    const updatedProfile: SocialUserProfile = {
      ...googleProfile,
      email: "alice-updated@gmail.com",
      displayName: "Alice Updated",
      avatarUrl: "https://lh3.googleusercontent.com/alice-v2.jpg",
    };
    const secondId = await upsertSocialUser(updatedProfile);

    expect(secondId).toBe(firstId);

    const result = await pg.query<{
      email: string;
      name: string;
      avatar_url: string;
    }>(
      "SELECT email, name, avatar_url FROM users WHERE provider_oid = $1",
      ["oid-google-001"],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe("alice-updated@gmail.com");
    expect(result.rows[0].name).toBe("Alice Updated");
    expect(result.rows[0].avatar_url).toBe(
      "https://lh3.googleusercontent.com/alice-v2.jpg",
    );
  });

  // T006 + T016: Apple user with null email → inserts without error, email column is null
  it("inserts Apple user with null email without DB error", async () => {
    const userId = await upsertSocialUser(appleProfileNullEmail);

    expect(userId).toBeTruthy();

    const result = await pg.query<{ email: string | null; provider: string }>(
      "SELECT email, provider FROM users WHERE id = $1",
      [userId],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBeNull();
    expect(result.rows[0].provider).toBe("apple");
  });

  // T020: Apple display name fallback when displayName is null
  it("uses 'Apple User' fallback when Apple profile has no displayName", async () => {
    const profileNoName: SocialUserProfile = {
      ...appleProfileNullEmail,
      displayName: null,
    };
    const userId = await upsertSocialUser(profileNoName);

    const result = await pg.query<{ name: string }>(
      "SELECT name FROM users WHERE id = $1",
      [userId],
    );
    expect(result.rows[0].name).toBeTruthy();
    expect(result.rows[0].name).not.toBe("");
  });
});

describe("getUserIdByOid", () => {
  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
  });

  afterEach(async () => {
    clearTestDb();
    await pg.close();
  });

  // T006: Returns platform UUID for known oid, null for unknown oid
  it("returns platform userId for known oid in users.provider_oid", async () => {
    const userId = await upsertSocialUser(googleProfile);
    const found = await getUserIdByOid("oid-google-001");
    expect(found).toBe(userId);
  });

  it("returns null for unknown oid", async () => {
    const found = await getUserIdByOid("oid-does-not-exist");
    expect(found).toBeNull();
  });

  // T006: Cross-lookup via linked_accounts
  it("returns userId via linked_accounts when oid is in linked_accounts", async () => {
    const userId = await upsertSocialUser(googleProfile);

    // Manually insert a linked account row (simulating account linking)
    await pg.query(
      "INSERT INTO linked_accounts (user_id, provider, provider_oid) VALUES ($1, $2, $3)",
      [userId, "apple", "oid-apple-linked-001"],
    );

    const found = await getUserIdByOid("oid-apple-linked-001");
    expect(found).toBe(userId);
  });

  // T017: Apple oid lookup works on repeated sign-ins (null email doesn't interfere)
  it("finds Apple user by oid on repeated sign-ins despite null email", async () => {
    const userId = await upsertSocialUser(appleProfileNullEmail);

    // Second sign-in: same oid, but email still null
    const secondId = await upsertSocialUser(appleProfileNullEmail);
    expect(secondId).toBe(userId);

    const found = await getUserIdByOid("oid-apple-002");
    expect(found).toBe(userId);
  });
});

// T010: Account continuity — same userId returned on repeated upserts
describe("Account continuity", () => {
  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
  });

  afterEach(async () => {
    clearTestDb();
    await pg.close();
  });

  it("returns same userId on two upserts with same oid", async () => {
    const id1 = await upsertSocialUser(googleProfile);
    const id2 = await upsertSocialUser(googleProfile);
    expect(id2).toBe(id1);
  });

  it("has only one row in users table after two upserts", async () => {
    await upsertSocialUser(googleProfile);
    await upsertSocialUser(googleProfile);

    const result = await pg.query(
      "SELECT COUNT(*)::int AS cnt FROM users WHERE provider_oid = $1",
      ["oid-google-001"],
    );
    expect((result.rows[0] as { cnt: number }).cnt).toBe(1);
  });
});
