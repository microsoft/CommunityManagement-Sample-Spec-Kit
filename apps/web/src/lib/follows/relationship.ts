import { db } from "@/lib/db/client";
import type { Relationship } from "@acroyoga/shared/types/community";

export async function getRelationship(
  viewerId: string | null,
  profileOwnerId: string,
): Promise<Relationship> {
  if (!viewerId) return "none";
  if (viewerId === profileOwnerId) return "self";

  const result = await db().query<{ follower_id: string; followee_id: string }>(
    `SELECT follower_id, followee_id FROM follows
     WHERE (follower_id = $1 AND followee_id = $2)
        OR (follower_id = $2 AND followee_id = $1)`,
    [viewerId, profileOwnerId],
  );

  const viewerFollows = result.rows.some(
    (r) => r.follower_id === viewerId && r.followee_id === profileOwnerId,
  );
  const ownerFollows = result.rows.some(
    (r) => r.follower_id === profileOwnerId && r.followee_id === viewerId,
  );

  if (viewerFollows && ownerFollows) return "friend";
  if (viewerFollows) return "following";
  if (ownerFollows) return "follower";
  return "none";
}
