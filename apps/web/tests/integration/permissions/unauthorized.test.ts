import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { checkPermission, grantPermission, revokePermission } from "@/lib/permissions/service";
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

describe("Unauthorized / 403 Smoke Tests — Permissions", () => {
  let userId: string;
  let adminId: string;

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

  it("member cannot grant permissions", async () => {
    const result = await checkPermission(userId, {
      action: "manageGrants",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("member");
  });

  it("event_creator cannot grant permissions", async () => {
    await grantPermission(userId, "event_creator", "city", "bristol", adminId);
    clearCache();

    const result = await checkPermission(userId, {
      action: "manageGrants",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
  });

  it("city_admin cannot manage grants outside their scope", async () => {
    await grantPermission(userId, "city_admin", "city", "bristol", adminId);
    clearCache();

    // Seed geography
    await pg.query(
      "INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent) VALUES ('bristol', 'united_kingdom', 'europe', 'Bristol', 'United Kingdom', 'Europe'), ('paris', 'france', 'europe', 'Paris', 'France', 'Europe')",
    );

    const result = await checkPermission(userId, {
      action: "manageGrants",
      targetScope: { scopeType: "city", scopeValue: "paris" },
    });
    expect(result.allowed).toBe(false);
  });

  it("revoked grant no longer grants access", async () => {
    const grant = await grantPermission(userId, "event_creator", "city", "bristol", adminId);
    clearCache();

    const before = await checkPermission(userId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(before.allowed).toBe(true);

    await revokePermission(grant.id, adminId);
    clearCache();

    const after = await checkPermission(userId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(after.allowed).toBe(false);
  });
});
