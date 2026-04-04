/**
 * Integration tests for POST /api/payments/webhook — Stripe webhook handler
 *
 * Tests the HTTP-level webhook endpoint behavior including:
 * - Missing signature → 400
 * - Invalid signature → 400
 * - Valid account.updated event → updates onboarding status
 * - Non-account.updated events → acknowledged but no side effects
 *
 * Constitution II (Test-First), XII (Financial Integrity)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import fs from "fs";
import path from "path";

// Mock Stripe to avoid real API calls
const mockConstructEvent = vi.fn();

vi.mock("stripe", () => {
  return {
    default: class MockStripe {
      webhooks = {
        constructEvent: mockConstructEvent,
      };
    },
  };
});

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

describe("POST /api/payments/webhook", () => {
  let userId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);

    userId = await createUser(pg, "creator@test.com");

    // Set required env vars
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
  });

  afterEach(async () => {
    clearTestDb();
    vi.resetAllMocks();
    await pg.close();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  async function callWebhook(body: string, signature: string | null) {
    const { POST } = await import("@/app/api/payments/webhook/route");
    const headers = new Headers();
    if (signature) {
      headers.set("stripe-signature", signature);
    }
    const request = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      body,
      headers,
    });
    // NextRequest constructor accepts a Request
    const { NextRequest } = await import("next/server");
    return POST(new NextRequest(request));
  }

  it("returns 400 when stripe-signature header is missing", async () => {
    const response = await callWebhook("{}", null);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Missing signature");
  });

  it("returns 400 when signature is invalid", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await callWebhook("{}", "invalid_sig");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Invalid signature");
  });

  it("processes account.updated event and updates onboarding status", async () => {
    // Create a payment account
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id) VALUES ($1, $2)",
      [userId, "acct_webhook_test"],
    );

    mockConstructEvent.mockReturnValue({
      type: "account.updated",
      data: {
        object: {
          id: "acct_webhook_test",
          charges_enabled: true,
          payouts_enabled: true,
        },
      },
    });

    const response = await callWebhook('{"type":"account.updated"}', "valid_sig");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.received).toBe(true);

    // Verify onboarding was updated
    const account = await pg.query<{ onboarding_complete: boolean }>(
      "SELECT onboarding_complete FROM creator_payment_accounts WHERE stripe_account_id = $1",
      ["acct_webhook_test"],
    );
    expect(account.rows[0].onboarding_complete).toBe(true);
  });

  it("sets onboarding incomplete when charges or payouts not enabled", async () => {
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id, onboarding_complete) VALUES ($1, $2, true)",
      [userId, "acct_incomplete"],
    );

    mockConstructEvent.mockReturnValue({
      type: "account.updated",
      data: {
        object: {
          id: "acct_incomplete",
          charges_enabled: true,
          payouts_enabled: false,
        },
      },
    });

    const response = await callWebhook("{}", "valid_sig");
    expect(response.status).toBe(200);

    const account = await pg.query<{ onboarding_complete: boolean }>(
      "SELECT onboarding_complete FROM creator_payment_accounts WHERE stripe_account_id = $1",
      ["acct_incomplete"],
    );
    expect(account.rows[0].onboarding_complete).toBe(false);
  });

  it("acknowledges non-account.updated events without side effects", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_test" } },
    });

    const response = await callWebhook("{}", "valid_sig");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.received).toBe(true);
  });
});
