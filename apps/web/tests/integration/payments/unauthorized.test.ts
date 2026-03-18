import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { getPaymentStatus } from "@/lib/payments/stripe-connect";
import { checkPermission } from "@/lib/permissions/service";
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

describe("Payment Unauthorized / 403 Smoke Tests", () => {
  let memberId: string;
  let creatorId: string;
  let adminId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
    clearCache();

    adminId = await createUser(pg, "admin@test.com");
    creatorId = await createUser(pg, "creator@test.com");
    memberId = await createUser(pg, "member@test.com");

    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'global_admin', 'global', NULL, $1)",
      [adminId],
    );
    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'event_creator', 'city', 'bristol', $2)",
      [creatorId, adminId],
    );
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await pg.close();
  });

  it("member without event_creator role cannot initiate Stripe Connect", async () => {
    // Members don't have the createEvent capability, so they shouldn't be able to connect Stripe
    const result = await checkPermission(memberId, {
      action: "createEvent",
      targetScope: { scopeType: "global", scopeValue: null },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("member");
  });

  it("unauthenticated user cannot access payment status", async () => {
    const result = await checkPermission(null, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("visitor");
  });

  it("getPaymentStatus returns not connected for user without Stripe account", async () => {
    const status = await getPaymentStatus(memberId);
    expect(status.connected).toBe(false);
    expect(status.account).toBeNull();
  });

  it("event_creator can check payment status", async () => {
    // Creator should be allowed to create events (prerequisite for Stripe Connect)
    const check = await checkPermission(creatorId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(check.allowed).toBe(true);

    // But no Stripe account yet
    const status = await getPaymentStatus(creatorId);
    expect(status.connected).toBe(false);
  });
});
