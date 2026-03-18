import { db } from "@/lib/db/client";

export async function isBlocked(userA: string, userB: string): Promise<boolean> {
  const result = await db().query(
    `SELECT 1 FROM blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [userA, userB],
  );
  return result.rows.length > 0;
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ blocked: boolean; severedFollows: number }> {
  if (blockerId === blockedId) {
    throw new Error("Cannot block yourself");
  }

  const already = await db().query(
    `SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId],
  );
  if (already.rows.length > 0) {
    return { blocked: false, severedFollows: 0 };
  }

  await db().query(
    `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`,
    [blockerId, blockedId],
  );

  // Sever follows in both directions
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM follows
     WHERE (follower_id = $1 AND followee_id = $2)
        OR (follower_id = $2 AND followee_id = $1)`,
    [blockerId, blockedId],
  );
  const severed = parseInt(countResult.rows[0].cnt, 10);

  if (severed > 0) {
    await db().query(
      `DELETE FROM follows
       WHERE (follower_id = $1 AND followee_id = $2)
          OR (follower_id = $2 AND followee_id = $1)`,
      [blockerId, blockedId],
    );
  }

  return { blocked: true, severedFollows: severed };
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const exists = await db().query(
    `SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId],
  );
  if (exists.rows.length === 0) return false;

  await db().query(
    `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId],
  );
  return true;
}

export async function getBlockList(
  userId: string,
): Promise<Array<{ userId: string; displayName: string | null; blockedAt: string }>> {
  const result = await db().query<{
    blocked_id: string;
    display_name: string | null;
    created_at: string;
  }>(
    `SELECT b.blocked_id, up.display_name, b.created_at
     FROM blocks b
     LEFT JOIN user_profiles up ON up.user_id = b.blocked_id
     WHERE b.blocker_id = $1
     ORDER BY b.created_at DESC`,
    [userId],
  );
  return result.rows.map((r) => ({
    userId: r.blocked_id,
    displayName: r.display_name,
    blockedAt: r.created_at,
  }));
}
