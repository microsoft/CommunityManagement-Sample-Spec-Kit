import type { PGlite } from "@electric-sql/pglite";
import { SAMPLE_USERS, findUserBySlug } from "../../src/lib/auth/mock-users";
import type { SampleUser } from "../../src/lib/auth/mock-users";

export { SAMPLE_USERS } from "../../src/lib/auth/mock-users";
export type { SampleUser } from "../../src/lib/auth/mock-users";

/**
 * Seed all sample users and their permission grants into a PGlite test database.
 * Also seeds required geography reference data.
 */
export async function seedSampleUsers(db: PGlite): Promise<void> {
  // Seed geography reference data
  await db.query(
    `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
     VALUES ('bristol', 'uk', 'europe', 'Bristol', 'United Kingdom', 'Europe')
     ON CONFLICT (city) DO NOTHING`,
  );

  for (const user of SAMPLE_USERS) {
    await db.query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [user.id, user.email, user.name],
    );

    for (const grant of user.grants) {
      const grantedBy =
        grant.role === "global_admin"
          ? user.id
          : SAMPLE_USERS[0].id;

      await db.query(
        `INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, role, scope_type, scope_value) WHERE revoked_at IS NULL
         DO NOTHING`,
        [user.id, grant.role, grant.scopeType, grant.scopeValue, grantedBy],
      );
    }
  }
}

/**
 * Seed a single sample user by slug into a PGlite test database.
 * Also seeds geography if needed for users with scoped grants.
 */
export async function seedSampleUser(
  db: PGlite,
  slug: string,
): Promise<SampleUser> {
  const user = findUserBySlug(slug);
  if (!user) {
    throw new Error(`Unknown sample user slug: ${slug}`);
  }

  // Seed geography if the user has scoped grants
  const needsGeography = user.grants.some(
    (g) => g.scopeType === "city" || g.scopeType === "country",
  );
  if (needsGeography) {
    await db.query(
      `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
       VALUES ('bristol', 'uk', 'europe', 'Bristol', 'United Kingdom', 'Europe')
       ON CONFLICT (city) DO NOTHING`,
    );
  }

  // If this user's grants reference another user as grantor, seed them first
  if (user.grants.length > 0 && user.id !== SAMPLE_USERS[0].id) {
    const admin = SAMPLE_USERS[0];
    await db.query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [admin.id, admin.email, admin.name],
    );
  }

  await db.query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
    [user.id, user.email, user.name],
  );

  for (const grant of user.grants) {
    const grantedBy =
      grant.role === "global_admin" ? user.id : SAMPLE_USERS[0].id;

    await db.query(
      `INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, role, scope_type, scope_value) WHERE revoked_at IS NULL
       DO NOTHING`,
      [user.id, grant.role, grant.scopeType, grant.scopeValue, grantedBy],
    );
  }

  return user;
}
