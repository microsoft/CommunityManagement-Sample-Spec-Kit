/**
 * HTTP-level integration tests for GET /api/payments/status
 *
 * Tests:
 * - 401 for unauthenticated requests
 * - 200 with not-connected status for new user
 * - 200 with connected status after Stripe account creation
 *
 * Constitution II (Test-First), XII (Financial Integrity)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import fs from "fs";
import path from "path";

// Mock getServerSession
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

describe("GET /api/payments/status (HTTP)", () => {
  let userId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);

    userId = await createUser(pg, "user@test.com");
  });

  afterEach(async () => {
    clearTestDb();
    vi.resetAllMocks();
    await pg.close();
  });

  async function callStatus(sessionOverride?: { userId: string } | null) {
    if (sessionOverride === null) {
      mockGetServerSession.mockResolvedValue(null);
    } else if (sessionOverride) {
      mockGetServerSession.mockResolvedValue(sessionOverride);
    }

    const { GET } = await import("@/app/api/payments/status/route");
    return GET();
  }

  it("returns 401 for unauthenticated request", async () => {
    const response = await callStatus(null);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns not-connected status for new user", async () => {
    const response = await callStatus({ userId });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.connected).toBe(false);
    expect(body.onboardingComplete).toBe(false);
    expect(body.account).toBeNull();
  });

  it("returns connected status after Stripe account creation", async () => {
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id) VALUES ($1, $2)",
      [userId, "acct_status_test"],
    );

    const response = await callStatus({ userId });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.account.stripeAccountId).toBe("acct_status_test");
  });

  it("reflects onboarding completion status", async () => {
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id, onboarding_complete) VALUES ($1, $2, true)",
      [userId, "acct_onboard_test"],
    );

    const response = await callStatus({ userId });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.onboardingComplete).toBe(true);
  });
});
