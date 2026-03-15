import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { submitRequest, reviewRequest, listRequests } from "@/lib/requests/service";
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

describe("Request Unauthorized / 403 Smoke Tests", () => {
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

  it("cannot submit request for a non-existent city", async () => {
    const { error } = await submitRequest(userId, "atlantis", "please");
    expect(error).toBe("invalid_city");
  });

  it("cannot review a non-existent request", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const { error } = await reviewRequest(fakeId, "approved", adminId, "ok");
    expect(error).toBe("not_found");
  });

  it("cannot approve an already-reviewed request", async () => {
    const { request } = await submitRequest(userId, "bristol", "please");
    await reviewRequest(request.id, "rejected", adminId, "no");

    const { error } = await reviewRequest(request.id, "approved", adminId, "changed my mind");
    expect(error).toBe("already_reviewed");
  });

  it("listRequests returns empty array when no requests exist", async () => {
    const reqs = await listRequests({});
    expect(reqs).toEqual([]);
  });
});
