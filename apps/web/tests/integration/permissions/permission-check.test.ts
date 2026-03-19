import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
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

describe("Permission Check", () => {
  let adminId: string;
  let creatorId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);
    clearCache();

    adminId = await createUser(pg, "admin@test.com");
    creatorId = await createUser(pg, "creator@test.com");

    // Bootstrap: global admin + event_creator for bristol
    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'global_admin', 'global', NULL, $1)",
      [adminId],
    );
    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'event_creator', 'city', 'bristol', $2)",
      [creatorId, adminId],
    );
    // Seed geography for hierarchy checks
    await pg.query(
      "INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent) VALUES ('bristol', 'united_kingdom', 'europe', 'Bristol', 'United Kingdom', 'Europe'), ('london', 'united_kingdom', 'europe', 'London', 'United Kingdom', 'Europe')",
    );
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await pg.close();
  });

  it("global admin is allowed any action at any scope", async () => {
    const result = await checkPermission(adminId, {
      action: "manageGrants",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(true);
    expect(result.effectiveRole).toBe("global_admin");
  });

  it("event_creator can createEvent in their city", async () => {
    const result = await checkPermission(creatorId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(true);
    expect(result.effectiveRole).toBe("event_creator");
  });

  it("event_creator cannot createEvent in a different city", async () => {
    const result = await checkPermission(creatorId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "london" },
    });
    expect(result.allowed).toBe(false);
  });

  it("event_creator cannot manageGrants", async () => {
    const result = await checkPermission(creatorId, {
      action: "manageGrants",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("event_creator");
  });

  it("unauthenticated user (null userId) returns visitor", async () => {
    const result = await checkPermission(null, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("visitor");
    expect(result.matchedGrant).toBeNull();
  });

  it("authenticated user with no grants returns member", async () => {
    const memberId = await createUser(pg, "member@test.com");
    const result = await checkPermission(memberId, {
      action: "createEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
    });
    expect(result.allowed).toBe(false);
    expect(result.effectiveRole).toBe("member");
  });

  it("owner can edit their own event even without editEvent capability", async () => {
    const result = await checkPermission(creatorId, {
      action: "editEvent",
      targetScope: { scopeType: "city", scopeValue: "bristol" },
      resourceOwnerId: creatorId,
    });
    expect(result.allowed).toBe(true);
  });
});
