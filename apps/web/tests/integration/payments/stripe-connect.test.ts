import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { getPaymentStatus, updateOnboardingStatus } from "@/lib/payments/stripe-connect";
import { clearCache } from "@/lib/permissions/cache";
import fs from "fs";
import path from "path";

let pg: PGlite;

async function applyMigrations(d: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
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

describe("Stripe Connect — Payment Account", () => {
  let userId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
    clearCache();

    userId = await createUser(pg, "creator@test.com");
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await pg.close();
  });

  it("getPaymentStatus returns not connected for new user", async () => {
    const status = await getPaymentStatus(userId);
    expect(status.connected).toBe(false);
    expect(status.onboardingComplete).toBe(false);
    expect(status.account).toBeNull();
  });

  it("getPaymentStatus returns connected after account creation", async () => {
    // Simulate what handleCallback does (without Stripe API call)
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id) VALUES ($1, $2)",
      [userId, "acct_test123"],
    );

    const status = await getPaymentStatus(userId);
    expect(status.connected).toBe(true);
    expect(status.onboardingComplete).toBe(false);
    expect(status.account!.stripeAccountId).toBe("acct_test123");
  });

  it("updateOnboardingStatus marks onboarding complete", async () => {
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id) VALUES ($1, $2)",
      [userId, "acct_test456"],
    );

    await updateOnboardingStatus("acct_test456", true);

    const status = await getPaymentStatus(userId);
    expect(status.onboardingComplete).toBe(true);
  });

  it("updateOnboardingStatus can set back to false", async () => {
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id, onboarding_complete) VALUES ($1, $2, true)",
      [userId, "acct_test789"],
    );

    await updateOnboardingStatus("acct_test789", false);

    const status = await getPaymentStatus(userId);
    expect(status.onboardingComplete).toBe(false);
  });
});
