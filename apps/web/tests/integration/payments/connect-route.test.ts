/**
 * HTTP-level integration tests for POST /api/payments/connect
 *
 * Tests:
 * - 401 for unauthenticated requests
 * - 403 for users without event_creator role
 * - 409 when already connected to Stripe
 * - 200 with redirect URL for valid creator
 *
 * Constitution II (Test-First), IX (Scoped Permissions), XII (Financial Integrity)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { clearCache } from "@/lib/permissions/cache";
import fs from "fs";
import path from "path";

// Mock getServerSession so we can control auth state
vi.mock("@/lib/auth/session", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "@/lib/auth/session";
const mockGetServerSession = vi.mocked(getServerSession);

let pg: PGlite;

async function applyMigrations(d: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await d.exec(sql);
  }
}

async function createUser(d: PGlite, email: string): Promise<string> {
  const result = await d.query<{ id: string }>(
    "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
    [email, email.split("@")[0]],
  );
  return result.rows[0].id;
}

describe("POST /api/payments/connect (HTTP)", () => {
  let creatorId: string;
  let memberId: string;
  let adminId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
    clearCache();

    adminId = await createUser(pg, "admin@test.com");
    creatorId = await createUser(pg, "creator@test.com");
    memberId = await createUser(pg, "member@test.com");

    // Seed geography
    await pg.query(
      `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
       VALUES ('bristol', 'uk', 'europe', 'Bristol', 'United Kingdom', 'Europe')
       ON CONFLICT (city) DO NOTHING`,
    );

    // Admin grant
    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'global_admin', 'global', NULL, $1)",
      [adminId],
    );

    // Creator grant — global scope (connect route checks global)
    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'event_creator', 'global', NULL, $2)",
      [creatorId, adminId],
    );

    // Set required env vars
    process.env.STRIPE_CLIENT_ID = "ca_test_fake";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    vi.resetAllMocks();
    await pg.close();
    delete process.env.STRIPE_CLIENT_ID;
    delete process.env.NEXTAUTH_URL;
  });

  async function callConnect(sessionOverride?: { userId: string } | null) {
    if (sessionOverride === null) {
      mockGetServerSession.mockResolvedValue(null);
    } else if (sessionOverride) {
      mockGetServerSession.mockResolvedValue(sessionOverride);
    }

    const { POST } = await import("@/app/api/payments/connect/route");
    const { NextRequest } = await import("next/server");
    const request = new NextRequest("http://localhost/api/payments/connect", {
      method: "POST",
    });
    return POST(request);
  }

  it("returns 401 for unauthenticated request", async () => {
    const response = await callConnect(null);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 403 for member without event_creator role", async () => {
    const response = await callConnect({ userId: memberId });
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toContain("Event Creator");
  });

  it("returns 409 when already connected to Stripe", async () => {
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id) VALUES ($1, $2)",
      [creatorId, "acct_existing"],
    );

    const response = await callConnect({ userId: creatorId });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toContain("Already connected");
  });

  it("returns 200 with Stripe Connect redirect URL for valid creator", async () => {
    const response = await callConnect({ userId: creatorId });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.redirectUrl).toBeDefined();
    expect(body.redirectUrl).toContain("connect.stripe.com/oauth/authorize");
    expect(body.redirectUrl).toContain("ca_test_fake");
    expect(body.redirectUrl).toContain(creatorId);
  });
});
