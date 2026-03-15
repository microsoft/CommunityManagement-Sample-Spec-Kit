import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { grantPermission, revokePermission } from "@/lib/permissions/service";
import { clearCache } from "@/lib/permissions/cache";
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

describe("Grant-Revoke Lifecycle", () => {
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);
    clearCache();

    adminId = await createUser(db, "admin@test.com");
    userId = await createUser(db, "user@test.com");

    // Bootstrap global admin
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

  it("should grant a permission and create an audit log entry", async () => {
    const grant = await grantPermission(userId, "event_creator", "city", "bristol", adminId);

    expect(grant.userId).toBe(userId);
    expect(grant.role).toBe("event_creator");
    expect(grant.scopeType).toBe("city");
    expect(grant.scopeValue).toBe("bristol");
    expect(grant.revokedAt).toBeNull();

    // Check audit log
    const audit = await db.query(
      "SELECT * FROM permission_audit_log WHERE user_id = $1 AND action = 'grant'",
      [userId],
    );
    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0].performed_by).toBe(adminId);
  });

  it("should revoke a permission and set revoked_at", async () => {
    const grant = await grantPermission(userId, "event_creator", "city", "bristol", adminId);
    const result = await revokePermission(grant.id, adminId);

    expect(result.grant.revokedAt).not.toBeNull();
    expect(result.error).toBeUndefined();

    // Check audit log has both grant and revoke
    const audit = await db.query(
      "SELECT * FROM permission_audit_log WHERE user_id = $1 ORDER BY created_at",
      [userId],
    );
    expect(audit.rows.length).toBe(2);
    expect(audit.rows[0].action).toBe("grant");
    expect(audit.rows[1].action).toBe("revoke");
  });

  it("should prevent revoking the last global admin", async () => {
    // adminId has the only global_admin grant
    const grants = await db.query<{ id: string }>(
      "SELECT id FROM permission_grants WHERE user_id = $1 AND role = 'global_admin'",
      [adminId],
    );

    const result = await revokePermission(grants.rows[0].id, adminId);
    expect(result.error).toBe("last_global_admin");
  });

  it("should return not_found for nonexistent grant", async () => {
    const result = await revokePermission("00000000-0000-0000-0000-000000000000", adminId);
    expect(result.error).toBe("not_found");
  });
});
