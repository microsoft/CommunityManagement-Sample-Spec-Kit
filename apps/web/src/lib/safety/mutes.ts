import { db } from "@/lib/db/client";

export async function getMutedUserIds(userId: string): Promise<string[]> {
  const result = await db().query<{ muted_id: string }>(
    `SELECT muted_id FROM mutes WHERE muter_id = $1`,
    [userId],
  );
  return result.rows.map((r) => r.muted_id);
}

export async function muteUser(muterId: string, mutedId: string): Promise<boolean> {
  if (muterId === mutedId) {
    throw new Error("Cannot mute yourself");
  }

  const already = await db().query(
    `SELECT 1 FROM mutes WHERE muter_id = $1 AND muted_id = $2`,
    [muterId, mutedId],
  );
  if (already.rows.length > 0) return false;

  await db().query(
    `INSERT INTO mutes (muter_id, muted_id) VALUES ($1, $2)`,
    [muterId, mutedId],
  );
  return true;
}

export async function unmuteUser(muterId: string, mutedId: string): Promise<boolean> {
  const exists = await db().query(
    `SELECT 1 FROM mutes WHERE muter_id = $1 AND muted_id = $2`,
    [muterId, mutedId],
  );
  if (exists.rows.length === 0) return false;

  await db().query(
    `DELETE FROM mutes WHERE muter_id = $1 AND muted_id = $2`,
    [muterId, mutedId],
  );
  return true;
}

export async function getMuteList(
  userId: string,
): Promise<Array<{ userId: string; displayName: string | null; mutedAt: string }>> {
  const result = await db().query<{
    muted_id: string;
    display_name: string | null;
    created_at: string;
  }>(
    `SELECT m.muted_id, up.display_name, m.created_at
     FROM mutes m
     LEFT JOIN user_profiles up ON up.user_id = m.muted_id
     WHERE m.muter_id = $1
     ORDER BY m.created_at DESC`,
    [userId],
  );
  return result.rows.map((r) => ({
    userId: r.muted_id,
    displayName: r.display_name,
    mutedAt: r.created_at,
  }));
}
