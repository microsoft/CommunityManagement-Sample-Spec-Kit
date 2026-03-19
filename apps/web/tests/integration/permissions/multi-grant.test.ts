import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { checkPermission, grantPermission } from "@/lib/permissions/service";
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

async function seedGeography(db: PGlite) {
  const cities = [
    ["bristol", "uk", "europe", "Bristol", "United Kingdom", "Europe"],
    ["london", "uk", "europe", "London", "United Kingdom", "Europe"],
    ["bath", "uk", "europe", "Bath", "United Kingdom", "Europe"],
  ];
  for (const [city, country, continent, dc, dco, dcon] of cities) {
    await db.query(
      "INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent) VALUES ($1,$2,$3,$4,$5,$6)",
      [city, country, continent, dc, dco, dcon],
    );
  }
}

describe("Multi-Grant Resolution", () => {
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);
    clearCache();
    await seedGeography(db);

    adminId = await createUser(db, "admin@test.com");
    userId = await createUser(db, "multi@test.com");

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

  it("user with City Admin Bristol + Event Creator Bath: Bristol yes, Bath yes, London no", async () => {
    await grantPermission(userId, "city_admin", "city", "bristol", adminId);
    await grantPermission(userId, "event_creator", "city", "bath", adminId);

    const bristol = await checkPermission(userId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(bristol.allowed).toBe(true);

    const bath = await checkPermission(userId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bath" },
    });
    expect(bath.allowed).toBe(true);

    const london = await checkPermission(userId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "london" },
    });
    expect(london.allowed).toBe(false);
  });

  it("most permissive grant wins — city_admin can manageGrants, event_creator cannot", async () => {
    await grantPermission(userId, "city_admin", "city", "bristol", adminId);
    await grantPermission(userId, "event_creator", "city", "bath", adminId);

    // city_admin for bristol can manage grants in bristol
    const grantsBristol = await checkPermission(userId, {
      action: "manageGrants",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(grantsBristol.allowed).toBe(true);

    // event_creator for bath cannot manage grants in bath
    const grantsBath = await checkPermission(userId, {
      action: "manageGrants",
      targetScope: { scopeType: "city", scopeValue: "bath" },
    });
    expect(grantsBath.allowed).toBe(false);
  });
});
