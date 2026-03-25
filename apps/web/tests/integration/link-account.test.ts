/**
 * Integration tests for POST /api/auth/link — account linking
 * Spec: 011-entra-external-id, Phase 5 (T022 + T023)
 *
 * Tests MUST FAIL before implementation (TDD — Constitution II).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { upsertSocialUser, getUserIdByOid } from "@/lib/auth/social-user";
import type { SocialUserProfile } from "@acroyoga/shared/types/auth";
import fs from "fs";
import path from "path";

// Mock getServerSession so we can control auth state in tests
vi.mock("@/lib/auth/session", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "@/lib/auth/session";
const mockGetServerSession = vi.mocked(getServerSession);

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
  providerOid: "oid-google-link-test-001",
  provider: "google",
  email: "linker@gmail.com",
  displayName: "Link Tester",
  avatarUrl: null,
};

const appleProfile: SocialUserProfile = {
  providerOid: "oid-apple-link-test-002",
  provider: "apple",
  email: null,
  displayName: "Apple Link Tester",
  avatarUrl: null,
};

describe("POST /api/auth/link", () => {
  let googleUserId: string;
  let linkToken: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);

    // Create a user to link from
    googleUserId = await upsertSocialUser(googleProfile);

    // Mock an authenticated session
    mockGetServerSession.mockResolvedValue({ userId: googleUserId });

    // We'll use a predictable test token for token-based tests
    linkToken = "test-link-token-valid-uuid";
  });

  afterEach(async () => {
    clearTestDb();
    vi.resetAllMocks();
    await pg.close();
  });

  // Import the route handler dynamically to avoid top-level module resolution issues
  async function callLinkRoute(
    body: Record<string, unknown>,
    sessionOverride?: { userId: string } | null,
  ) {
    if (sessionOverride !== undefined) {
      if (sessionOverride === null) {
        mockGetServerSession.mockResolvedValue(null);
      } else {
        mockGetServerSession.mockResolvedValue(sessionOverride);
      }
    }

    const { linkAccount } = await import("@/lib/auth/link-account");
    return linkAccount({
      userId: sessionOverride?.userId ?? googleUserId,
      providerOid: body.providerOid as string,
      provider: body.provider as string,
      linkToken: body.linkToken as string,
      validToken: body.linkToken === linkToken,
    });
  }

  // T022: Unauthenticated request → 401
  it("returns 401 when user is not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { linkAccount } = await import("@/lib/auth/link-account");

    await expect(
      linkAccount({
        userId: null,
        providerOid: "oid-apple-link-test-002",
        provider: "apple",
        linkToken: linkToken,
        validToken: true,
      }),
    ).rejects.toThrow("AUTH_REQUIRED");
  });

  // T022: Valid link with unused oid → linked_accounts row created
  it("creates a linked_accounts row for valid, unused oid", async () => {
    const { linkAccount } = await import("@/lib/auth/link-account");

    const result = await linkAccount({
      userId: googleUserId,
      providerOid: "oid-apple-link-test-002",
      provider: "apple",
      linkToken: linkToken,
      validToken: true,
    });

    expect(result.linked).toBe(true);
    expect(result.account.provider).toBe("apple");

    const rows = await pg.query(
      "SELECT * FROM linked_accounts WHERE user_id = $1 AND provider_oid = $2",
      [googleUserId, "oid-apple-link-test-002"],
    );
    expect(rows.rows).toHaveLength(1);
  });

  // T022: Same oid linked to same userId again → 200 (idempotent)
  it("is idempotent — linking same oid twice returns success and creates only one row", async () => {
    const { linkAccount } = await import("@/lib/auth/link-account");

    await linkAccount({
      userId: googleUserId,
      providerOid: "oid-apple-link-test-002",
      provider: "apple",
      linkToken: linkToken,
      validToken: true,
    });

    // Link again — should succeed (idempotent)
    const result = await linkAccount({
      userId: googleUserId,
      providerOid: "oid-apple-link-test-002",
      provider: "apple",
      linkToken: linkToken,
      validToken: true,
    });

    expect(result.linked).toBe(true);

    const rows = await pg.query(
      "SELECT COUNT(*)::int AS cnt FROM linked_accounts WHERE user_id = $1 AND provider_oid = $2",
      [googleUserId, "oid-apple-link-test-002"],
    );
    expect((rows.rows[0] as { cnt: number }).cnt).toBe(1);
  });

  // T022: Same oid linked to different userId → 409
  it("returns LINK_CONFLICT when oid is already linked to a different user", async () => {
    const { linkAccount } = await import("@/lib/auth/link-account");

    // Create second user
    const otherProfile: SocialUserProfile = {
      providerOid: "oid-other-user-003",
      provider: "google",
      email: "other@gmail.com",
      displayName: "Other User",
      avatarUrl: null,
    };
    const otherUserId = await upsertSocialUser(otherProfile);

    // Link apple oid to first user
    await linkAccount({
      userId: googleUserId,
      providerOid: "oid-apple-link-test-002",
      provider: "apple",
      linkToken: linkToken,
      validToken: true,
    });

    // Attempt to link same apple oid to second user → conflict
    await expect(
      linkAccount({
        userId: otherUserId,
        providerOid: "oid-apple-link-test-002",
        provider: "apple",
        linkToken: linkToken,
        validToken: true,
      }),
    ).rejects.toThrow("LINK_CONFLICT");
  });

  // T022: Invalid/expired linkToken → 422
  it("returns INVALID_LINK_TOKEN for invalid token", async () => {
    const { linkAccount } = await import("@/lib/auth/link-account");

    await expect(
      linkAccount({
        userId: googleUserId,
        providerOid: "oid-apple-link-test-002",
        provider: "apple",
        linkToken: "invalid-token",
        validToken: false,
      }),
    ).rejects.toThrow("INVALID_LINK_TOKEN");
  });
});

// T023: Cross-provider login after linking
describe("Cross-provider login after account linking", () => {
  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
  });

  afterEach(async () => {
    clearTestDb();
    await pg.close();
  });

  it("getUserIdByOid returns the Google user's userId after Apple oid is linked", async () => {
    const googleUserId = await upsertSocialUser(googleProfile);

    // Manually insert linked account (simulating the link flow)
    await pg.query(
      "INSERT INTO linked_accounts (user_id, provider, provider_oid) VALUES ($1, $2, $3)",
      [googleUserId, "apple", appleProfile.providerOid],
    );

    // Apple oid lookup → should return Google user's userId
    const foundUserId = await getUserIdByOid(appleProfile.providerOid);
    expect(foundUserId).toBe(googleUserId);
  });
});
