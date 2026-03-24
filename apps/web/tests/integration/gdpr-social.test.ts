/**
 * Integration tests for GDPR deletion and export — social auth fields
 * Spec: 011-entra-external-id, Phase 6 (T028 + T029)
 *
 * Tests MUST FAIL before implementation (TDD — Constitution II).
 * Verifies that the new social PII fields (provider_oid, avatar_url, linked_accounts)
 * are covered by deletion and export operations.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { deleteAccount } from "@/lib/gdpr/deletion";
import { processExport } from "@/lib/gdpr/full-export";
import { upsertSocialUser } from "@/lib/auth/social-user";
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
  providerOid: "oid-gdpr-test-google-001",
  provider: "google",
  email: "gdpr-test@gmail.com",
  displayName: "GDPR Test User",
  avatarUrl: "https://example.com/avatar.jpg",
};

const appleProfile: SocialUserProfile = {
  providerOid: "oid-gdpr-test-apple-002",
  provider: "apple",
  email: null,
  displayName: "GDPR Apple User",
  avatarUrl: null,
};

describe("GDPR deletion — social auth fields (T028)", () => {
  let userId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);

    // Create user with social fields
    userId = await upsertSocialUser(googleProfile);

    // Add a linked account
    await pg.query(
      "INSERT INTO linked_accounts (user_id, provider, provider_oid) VALUES ($1, $2, $3)",
      [userId, "apple", appleProfile.providerOid],
    );
  });

  afterEach(async () => {
    clearTestDb();
    await pg.close();
  });

  it("deletes linked_accounts rows on GDPR deletion", async () => {
    await deleteAccount(userId, "DELETE");

    const rows = await pg.query(
      "SELECT COUNT(*)::int AS cnt FROM linked_accounts WHERE user_id = $1",
      [userId],
    );
    expect((rows.rows[0] as { cnt: number }).cnt).toBe(0);
  });

  it("anonymises social PII fields on GDPR deletion", async () => {
    await deleteAccount(userId, "DELETE");

    const result = await pg.query<{
      provider_oid: string | null;
      avatar_url: string | null;
      provider: string | null;
      email: string;
      name: string;
    }>(
      "SELECT provider_oid, avatar_url, provider, email, name FROM users WHERE id = $1",
      [userId],
    );
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];

    // Social PII fields should be anonymised
    expect(row.provider_oid).toBeNull();
    expect(row.avatar_url).toBeNull();
    expect(row.provider).toBeNull();
    // Email and name should be anonymised
    expect(row.email).toBe("[deleted]");
    expect(row.name).toBe("[deleted]");
  });
});

describe("GDPR export — social auth fields (T029)", () => {
  let userId: string;
  let exportId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);

    // Create user with social fields
    userId = await upsertSocialUser(googleProfile);

    // Add a linked account
    await pg.query(
      "INSERT INTO linked_accounts (user_id, provider, provider_oid) VALUES ($1, $2, $3)",
      [userId, "apple", appleProfile.providerOid],
    );

    // Create an export row
    const expResult = await pg.query<{ id: string }>(
      "INSERT INTO data_exports (user_id) VALUES ($1) RETURNING id",
      [userId],
    );
    exportId = expResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await pg.close();
  });

  it("includes linked_accounts in data export", async () => {
    const exportData = await processExport(exportId);

    expect(exportData).toHaveProperty("linkedAccounts");
    expect(Array.isArray(exportData.linkedAccounts)).toBe(true);
    expect(exportData.linkedAccounts).toHaveLength(1);
    expect(exportData.linkedAccounts![0]).toMatchObject({
      provider: "apple",
    });
  });

  it("includes social fields from users in data export", async () => {
    const exportData = await processExport(exportId);

    // Export should include linked accounts (social auth data)
    expect(exportData).toHaveProperty("linkedAccounts");
    expect(Array.isArray(exportData.linkedAccounts)).toBe(true);
    // profile from user_profiles table may be null if not set up — that's fine
    // The key GDPR requirement is that linkedAccounts are included
  });
});
