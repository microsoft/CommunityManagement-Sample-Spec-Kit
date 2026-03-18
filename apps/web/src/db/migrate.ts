import fs from "fs";
import path from "path";
import { getDb } from "../lib/db/client";

const MIGRATIONS_DIR = path.resolve(__dirname, "migrations");

async function migrate() {
  const db = getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = await db.query<{ name: string }>("SELECT name FROM _migrations ORDER BY id");
  const appliedNames = new Set(applied.rows.map((r) => r.name));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`  skip: ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await db.query("COMMIT");
      console.log(`  done: ${file}`);
    } catch (err) {
      await db.query("ROLLBACK");
      console.error(`  FAIL: ${file}`, err);
      process.exit(1);
    }
  }

  console.log("Migrations complete.");
  process.exit(0);
}

migrate();
