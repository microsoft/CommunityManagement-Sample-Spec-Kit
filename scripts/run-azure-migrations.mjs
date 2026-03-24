/**
 * One-time migration runner for Azure PostgreSQL with Entra token auth.
 * Usage: node scripts/run-azure-migrations.mjs
 * Requires: PGHOST, PGDATABASE env vars or defaults below.
 * Uses az CLI token for authentication.
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const MIGRATIONS_DIR = path.resolve(SCRIPT_DIR, "../apps/web/src/db/migrations");

console.log(`Connecting to database...`);

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 1,
});

try {
  // Test connection
  const whoami = await pool.query("SELECT current_user, current_database()");
  console.log(`Connected as: ${whoami.rows[0].current_user}, db: ${whoami.rows[0].current_database}`);

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Check already applied
  const applied = await pool.query("SELECT name FROM _migrations ORDER BY id");
  const appliedNames = new Set(applied.rows.map((r) => r.name));
  console.log(`Already applied: ${appliedNames.size} migrations`);

  // Get and sort migration files
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`  skip: ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`  done: ${file}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`  FAIL: ${file}`, err.message);
      process.exit(1);
    }
  }

  console.log("\nAll migrations complete!");

  // Verify tables created
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log("\nTables in database:");
  tables.rows.forEach((r) => console.log(`  - ${r.table_name}`));
} finally {
  await pool.end();
}
