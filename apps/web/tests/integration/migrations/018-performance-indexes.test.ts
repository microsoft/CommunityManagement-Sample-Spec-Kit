import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

let db: PGlite;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

describe("018 performance indexes migration", () => {
  beforeAll(async () => {
    db = new PGlite();
    await applyMigrations(db);
  });

  afterAll(async () => {
    await db.close();
  });

  const expectedIndexes = [
    "idx_events_status_start",
    "idx_rsvps_event_status",
    "idx_event_interests_event_id",
    "idx_teacher_profiles_active_badge",
    "idx_profiles_display_name",
  ];

  it("creates all 5 performance indexes", async () => {
    const result = await db.query<{ indexname: string }>(
      `SELECT indexname
       FROM pg_indexes
       WHERE indexname IN (
         'idx_events_status_start',
         'idx_rsvps_event_status',
         'idx_event_interests_event_id',
         'idx_teacher_profiles_active_badge',
         'idx_profiles_display_name'
       )
       ORDER BY indexname`,
    );
    const names = result.rows.map((r) => r.indexname);
    expect(names).toHaveLength(5);
    for (const name of expectedIndexes) {
      expect(names).toContain(name);
    }
  });

  it("migration is idempotent — running twice does not error", async () => {
    const migrationSql = fs.readFileSync(
      path.resolve(__dirname, "../../../src/db/migrations/018-001-performance-indexes.sql"),
      "utf-8",
    );
    // Second run should not throw
    await expect(db.exec(migrationSql)).resolves.not.toThrow();
  });
});
