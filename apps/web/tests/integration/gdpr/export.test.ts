import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { grantPermission } from "@/lib/permissions/service";
import { submitRequest } from "@/lib/requests/service";
import { exportUserData } from "@/lib/gdpr/export";
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

describe("GDPR Data Export", () => {
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
    clearCache();

    adminId = await createUser(pg, "admin@test.com");
    userId = await createUser(pg, "user@test.com");

    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'global_admin', 'global', NULL, $1)",
      [adminId],
    );
    await pg.query(
      "INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent) VALUES ('bristol', 'united_kingdom', 'europe', 'Bristol', 'United Kingdom', 'Europe')",
    );
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await pg.close();
  });

  it("exports empty data for user with no activity", async () => {
    const data = await exportUserData(userId);
    expect(data.userId).toBe(userId);
    expect(data.permissionGrants).toEqual([]);
    expect(data.permissionRequests).toEqual([]);
    expect(data.paymentAccounts).toEqual([]);
    expect(data.auditLog).toEqual([]);
    expect(data.exportedAt).toBeTruthy();
  });

  it("exports grants, requests, and audit logs for active user", async () => {
    // Create a grant
    await grantPermission(userId, "event_creator", "city", "bristol", adminId);
    clearCache();

    // Submit a request
    await submitRequest(userId, "bristol", "I want to teach");

    const data = await exportUserData(userId);
    expect(data.permissionGrants.length).toBe(1);
    expect(data.permissionRequests.length).toBe(1);
    expect(data.auditLog.length).toBeGreaterThanOrEqual(1);
  });

  it("exports payment accounts when connected", async () => {
    await pg.query(
      "INSERT INTO creator_payment_accounts (user_id, stripe_account_id) VALUES ($1, 'acct_test')",
      [userId],
    );

    const data = await exportUserData(userId);
    expect(data.paymentAccounts.length).toBe(1);
  });
});
