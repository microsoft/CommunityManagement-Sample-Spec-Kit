import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { clearCache } from "@/lib/permissions/cache";
import { submitRequest, reviewRequest, listRequests } from "@/lib/requests/service";
import fs from "fs";
import path from "path";

let db: PGlite;

async function applyMigrations(db: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await db.exec(sql);
  }
}

async function createUser(db: PGlite, email: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
    [email, email.split("@")[0]],
  );
  return result.rows[0].id;
}

async function seedGeography(db: PGlite) {
  await db.query(
    "INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent) VALUES ($1,$2,$3,$4,$5,$6)",
    ["bristol", "uk", "europe", "Bristol", "United Kingdom", "Europe"],
  );
}

describe("Request Lifecycle", () => {
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);
    clearCache();
    await seedGeography(db);

    adminId = await createUser(db, "admin@test.com");
    memberId = await createUser(db, "member@test.com");

    await db.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'global_admin', 'global', NULL, $1)",
      [adminId],
    );
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await db.close();
  });

  it("submit → approve → grant created → audit trail", async () => {
    // Submit
    const submitResult = await submitRequest(memberId, "bristol", "I'd like to create events");
    expect(submitResult.error).toBeUndefined();
    expect(submitResult.request.status).toBe("pending");
    expect(submitResult.request.scopeValue).toBe("bristol");

    // Verify pending request
    const pending = await listRequests({ status: "pending" });
    expect(pending.length).toBe(1);

    // Approve
    const reviewResult = await reviewRequest(submitResult.request.id, "approved", adminId);
    expect(reviewResult.error).toBeUndefined();
    expect(reviewResult.request.status).toBe("approved");
    expect(reviewResult.grantId).toBeDefined();

    // Verify grant was created
    const grants = await db.query(
      "SELECT * FROM permission_grants WHERE user_id = $1 AND role = 'event_creator' AND revoked_at IS NULL",
      [memberId],
    );
    expect(grants.rows.length).toBe(1);

    // Verify audit trail
    const audit = await db.query(
      "SELECT action FROM permission_audit_log WHERE user_id = $1 ORDER BY created_at",
      [memberId],
    );
    const actions = audit.rows.map((r: { action: string }) => r.action);
    expect(actions).toContain("request_submitted");
    expect(actions).toContain("request_approved");
    expect(actions).toContain("grant");
  });

  it("submit → reject with reason → resubmit succeeds", async () => {
    const submitResult = await submitRequest(memberId, "bristol");
    const reviewResult = await reviewRequest(
      submitResult.request.id, "rejected", adminId, "Please provide more info",
    );
    expect(reviewResult.request.status).toBe("rejected");
    expect(reviewResult.request.reviewReason).toBe("Please provide more info");
    expect(reviewResult.grantId).toBeUndefined();

    // Can resubmit after rejection
    const resubmit = await submitRequest(memberId, "bristol", "More context here");
    expect(resubmit.error).toBeUndefined();
    expect(resubmit.request.status).toBe("pending");
  });

  it("duplicate pending request returns error", async () => {
    await submitRequest(memberId, "bristol");
    const dup = await submitRequest(memberId, "bristol");
    expect(dup.error).toBe("duplicate_pending");
  });

  it("rejects invalid city", async () => {
    const result = await submitRequest(memberId, "atlantis");
    expect(result.error).toBe("invalid_city");
  });

  it("rejects already-reviewed request", async () => {
    const submitResult = await submitRequest(memberId, "bristol");
    await reviewRequest(submitResult.request.id, "approved", adminId);

    const doubleReview = await reviewRequest(submitResult.request.id, "rejected", adminId);
    expect(doubleReview.error).toBe("already_reviewed");
  });
});
