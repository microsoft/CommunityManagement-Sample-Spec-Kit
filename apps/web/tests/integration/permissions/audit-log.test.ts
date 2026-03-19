import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { grantPermission, revokePermission } from "@/lib/permissions/service";
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

describe("Audit Log", () => {
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
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await pg.close();
  });

  it("grant creates an audit entry with action=grant", async () => {
    await grantPermission(userId, "event_creator", "city", "bristol", adminId);

    const logs = await pg.query<{ action: string; user_id: string; performed_by: string; role: string }>(
      "SELECT * FROM permission_audit_log WHERE action = 'grant' AND user_id = $1",
      [userId],
    );
    expect(logs.rows.length).toBe(1);
    expect(logs.rows[0].performed_by).toBe(adminId);
    expect(logs.rows[0].role).toBe("event_creator");
  });

  it("revoke creates an audit entry with action=revoke", async () => {
    const grant = await grantPermission(userId, "event_creator", "city", "bristol", adminId);
    await revokePermission(grant.id, adminId);

    const logs = await pg.query<{ action: string; user_id: string }>(
      "SELECT * FROM permission_audit_log WHERE action = 'revoke' AND user_id = $1",
      [userId],
    );
    expect(logs.rows.length).toBe(1);
  });

  it("audit log entries have timestamps", async () => {
    await grantPermission(userId, "event_creator", "city", "bristol", adminId);

    const logs = await pg.query<{ created_at: string }>(
      "SELECT created_at FROM permission_audit_log WHERE user_id = $1",
      [userId],
    );
    expect(logs.rows[0].created_at).toBeTruthy();
  });

  it("audit log records scope information", async () => {
    await grantPermission(userId, "city_admin", "city", "london", adminId);

    const logs = await pg.query<{ scope_type: string; scope_value: string }>(
      "SELECT scope_type, scope_value FROM permission_audit_log WHERE user_id = $1 AND action = 'grant'",
      [userId],
    );
    expect(logs.rows[0].scope_type).toBe("city");
    expect(logs.rows[0].scope_value).toBe("london");
  });
});
