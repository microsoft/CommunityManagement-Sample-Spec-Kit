import { getDb } from "../../lib/db/client";

async function seed() {
  const emailArg = process.argv.find((a) => a.startsWith("--email="));
  const emailFlag = process.argv.indexOf("--email");
  let email: string | undefined;

  if (emailArg) {
    email = emailArg.split("=")[1];
  } else if (emailFlag !== -1 && process.argv[emailFlag + 1]) {
    email = process.argv[emailFlag + 1];
  }

  if (!email) {
    console.error("Usage: npm run db:seed:admin -- --email admin@example.com");
    process.exit(1);
  }

  const db = getDb();

  // Create or find user
  const userResult = await db.query<{ id: string }>(
    `INSERT INTO users (email, name) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [email, "Global Admin"],
  );
  const userId = userResult.rows[0].id;

  // Create global admin grant
  await db.query(
    `INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by)
     VALUES ($1, 'global_admin', 'global', NULL, $1)
     ON CONFLICT DO NOTHING`,
    [userId],
  );

  console.log(`Global admin created: ${email} (${userId})`);
  process.exit(0);
}

seed();
