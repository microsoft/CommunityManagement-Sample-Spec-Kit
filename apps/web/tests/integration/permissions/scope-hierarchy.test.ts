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
    ["paris", "france", "europe", "Paris", "France", "Europe"],
    ["san_francisco", "us", "north_america", "San Francisco", "United States", "North America"],
  ];
  for (const [city, country, continent, dc, dco, dcon] of cities) {
    await db.query(
      "INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent) VALUES ($1,$2,$3,$4,$5,$6)",
      [city, country, continent, dc, dco, dcon],
    );
  }
}

describe("Scope Hierarchy", () => {
  let adminId: string;
  let ukAdminId: string;
  let bristolCreatorId: string;

  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);
    clearCache();
    await seedGeography(db);

    adminId = await createUser(db, "global@test.com");
    ukAdminId = await createUser(db, "uk@test.com");
    bristolCreatorId = await createUser(db, "bristol@test.com");

    // Bootstrap grants
    await db.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'global_admin', 'global', NULL, $1)",
      [adminId],
    );
    await grantPermission(ukAdminId, "country_admin", "country", "uk", adminId);
    await grantPermission(bristolCreatorId, "event_creator", "city", "bristol", adminId);
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await db.close();
  });

  it("city grant covers only that city", async () => {
    const bristol = await checkPermission(bristolCreatorId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(bristol.allowed).toBe(true);

    const london = await checkPermission(bristolCreatorId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "london" },
    });
    expect(london.allowed).toBe(false);
  });

  it("country grant covers all cities in that country", async () => {
    const bristol = await checkPermission(ukAdminId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(bristol.allowed).toBe(true);

    const london = await checkPermission(ukAdminId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "london" },
    });
    expect(london.allowed).toBe(true);
  });

  it("country grant does not cover cities in other countries", async () => {
    const paris = await checkPermission(ukAdminId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "paris" },
    });
    expect(paris.allowed).toBe(false);
  });

  it("global grant covers everything", async () => {
    const sf = await checkPermission(adminId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "san_francisco" },
    });
    expect(sf.allowed).toBe(true);
  });

  it("returns 'member' for authenticated user with no grants", async () => {
    const memberId = await createUser(db, "member@test.com");
    const result = await checkPermission(memberId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("member");
  });

  it("returns 'visitor' for unauthenticated user", async () => {
    const result = await checkPermission(null, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("visitor");
  });
});
