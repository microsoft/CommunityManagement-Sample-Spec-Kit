import { db } from "@/lib/db/client";
import { SAMPLE_USERS, isMockAuthEnabled } from "./mock-users";
import type { DbClient } from "@/lib/db/client";

let _seeded = false;

export async function seedMockUsers(client?: DbClient): Promise<{
  usersSeeded: number;
  grantsSeeded: number;
}> {
  const d = client ?? db();

  // Upsert geography reference data
  await d.query(
    `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
     VALUES ('bristol', 'uk', 'europe', 'Bristol', 'United Kingdom', 'Europe')
     ON CONFLICT (city) DO NOTHING`,
  );

  let usersSeeded = 0;
  let grantsSeeded = 0;

  for (const user of SAMPLE_USERS) {
    // Upsert user
    await d.query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [user.id, user.email, user.name],
    );
    usersSeeded++;

    // Upsert permission grants
    for (const grant of user.grants) {
      const grantedBy =
        grant.role === "global_admin"
          ? user.id // self-granted for global admin
          : SAMPLE_USERS[0].id; // Alice grants others

      await d.query(
        `INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, role, scope_type, scope_value) WHERE revoked_at IS NULL
         DO NOTHING`,
        [user.id, grant.role, grant.scopeType, grant.scopeValue, grantedBy],
      );
      grantsSeeded++;
    }
  }

  _seeded = true;
  return { usersSeeded, grantsSeeded };
}

export async function ensureMockSeeded(client?: DbClient): Promise<void> {
  if (_seeded) return;
  if (!isMockAuthEnabled()) return;
  await seedMockUsers(client);
}

export function resetSeedState(): void {
  _seeded = false;
}
