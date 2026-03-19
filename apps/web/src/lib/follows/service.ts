import { db } from "@/lib/db/client";
import { isBlocked } from "@/lib/safety/blocks";
import type { FollowEntry, Relationship } from "@acroyoga/shared/types/community";

export async function follow(
  followerId: string,
  followeeId: string,
): Promise<{ followed: boolean; becameFriends: boolean }> {
  if (followerId === followeeId) {
    throw new Error("Cannot follow yourself");
  }

  const blocked = await isBlocked(followerId, followeeId);
  if (blocked) {
    throw new Error("Cannot follow a blocked user");
  }

  const already = await db().query(
    `SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2`,
    [followerId, followeeId],
  );
  if (already.rows.length > 0) {
    return { followed: false, becameFriends: false };
  }

  await db().query(
    `INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)`,
    [followerId, followeeId],
  );

  // Check if now mutual
  const reverse = await db().query(
    `SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2`,
    [followeeId, followerId],
  );

  return { followed: true, becameFriends: reverse.rows.length > 0 };
}

export async function unfollow(followerId: string, followeeId: string): Promise<boolean> {
  const exists = await db().query(
    `SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2`,
    [followerId, followeeId],
  );
  if (exists.rows.length === 0) return false;

  await db().query(
    `DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2`,
    [followerId, followeeId],
  );
  return true;
}

export async function getFollowers(
  userId: string,
  viewerId: string | null,
  page = 1,
  pageSize = 20,
): Promise<{ entries: FollowEntry[]; total: number }> {
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM follows WHERE followee_id = $1`,
    [userId],
  );
  const total = parseInt(countResult.rows[0].cnt, 10);

  const offset = (page - 1) * pageSize;
  const result = await db().query<{
    follower_id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>(
    `SELECT f.follower_id, up.display_name, up.avatar_url, f.created_at
     FROM follows f
     LEFT JOIN user_profiles up ON up.user_id = f.follower_id
     WHERE f.followee_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  );

  const userIds = result.rows.map((r) => r.follower_id);
  const relationships = await getRelationshipsBatch(viewerId, userIds);

  const entries: FollowEntry[] = result.rows.map((r) => ({
    userId: r.follower_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    relationship: relationships.get(r.follower_id) ?? "none",
    followedAt: r.created_at,
  }));

  return { entries, total };
}

export async function getFollowing(
  userId: string,
  viewerId: string | null,
  page = 1,
  pageSize = 20,
): Promise<{ entries: FollowEntry[]; total: number }> {
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM follows WHERE follower_id = $1`,
    [userId],
  );
  const total = parseInt(countResult.rows[0].cnt, 10);

  const offset = (page - 1) * pageSize;
  const result = await db().query<{
    followee_id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>(
    `SELECT f.followee_id, up.display_name, up.avatar_url, f.created_at
     FROM follows f
     LEFT JOIN user_profiles up ON up.user_id = f.followee_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  );

  const userIds = result.rows.map((r) => r.followee_id);
  const relationships = await getRelationshipsBatch(viewerId, userIds);

  const entries: FollowEntry[] = result.rows.map((r) => ({
    userId: r.followee_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    relationship: relationships.get(r.followee_id) ?? "none",
    followedAt: r.created_at,
  }));

  return { entries, total };
}

export async function getFriends(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<{ entries: FollowEntry[]; total: number }> {
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM follows f1
     INNER JOIN follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
     WHERE f1.follower_id = $1`,
    [userId],
  );
  const total = parseInt(countResult.rows[0].cnt, 10);

  const offset = (page - 1) * pageSize;
  const result = await db().query<{
    friend_id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>(
    `SELECT f1.followee_id as friend_id, up.display_name, up.avatar_url, f1.created_at
     FROM follows f1
     INNER JOIN follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
     LEFT JOIN user_profiles up ON up.user_id = f1.followee_id
     WHERE f1.follower_id = $1
     ORDER BY f1.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  );

  return {
    entries: result.rows.map((r) => ({
      userId: r.friend_id,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      relationship: "friend" as Relationship,
      followedAt: r.created_at,
    })),
    total,
  };
}

/** Batch-load relationships between viewerId and a list of user IDs in a single query. */
async function getRelationshipsBatch(
  viewerId: string | null,
  userIds: string[],
): Promise<Map<string, Relationship>> {
  const map = new Map<string, Relationship>();
  if (!viewerId || userIds.length === 0) return map;

  const result = await db().query<{ follower_id: string; followee_id: string }>(
    `SELECT follower_id, followee_id FROM follows
     WHERE (follower_id = $1 AND followee_id = ANY($2))
        OR (followee_id = $1 AND follower_id = ANY($2))`,
    [viewerId, userIds],
  );

  for (const uid of userIds) {
    if (uid === viewerId) {
      map.set(uid, "self");
      continue;
    }
    const viewerFollows = result.rows.some(
      (r) => r.follower_id === viewerId && r.followee_id === uid,
    );
    const ownerFollows = result.rows.some(
      (r) => r.follower_id === uid && r.followee_id === viewerId,
    );
    if (viewerFollows && ownerFollows) map.set(uid, "friend");
    else if (viewerFollows) map.set(uid, "following");
    else if (ownerFollows) map.set(uid, "follower");
    else map.set(uid, "none");
  }
  return map;
}
