import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../src/db/migrations");

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    await db.exec(sql);
  }

  return db;
}
