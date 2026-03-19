import { db } from "@/lib/db/client";
import type { ThreadAccess } from "@acroyoga/shared/types/community";

export async function getThreadAccess(
  threadId: string,
  userId: string | null,
): Promise<ThreadAccess> {
  // Get thread
  const threadResult = await db().query<{
    entity_type: string;
    entity_id: string;
    is_locked: boolean;
  }>(
    `SELECT entity_type, entity_id, is_locked FROM threads WHERE id = $1`,
    [threadId],
  );

  if (threadResult.rows.length === 0) {
    return { canRead: false, canPost: false, reason: "Thread not found" };
  }

  const thread = threadResult.rows[0];

  if (!userId) {
    return { canRead: true, canPost: false, reason: "Not authenticated" };
  }

  if (thread.is_locked) {
    return { canRead: true, canPost: false, reason: "Thread is locked" };
  }

  if (thread.entity_type === "event") {
    // Check if user has an active RSVP for this event
    const rsvpResult = await db().query(
      `SELECT 1 FROM rsvps
       WHERE event_id = $1 AND user_id = $2 AND status IN ('confirmed', 'pending_payment')
       LIMIT 1`,
      [thread.entity_id, userId],
    );

    if (rsvpResult.rows.length > 0) {
      return { canRead: true, canPost: true };
    }

    return { canRead: true, canPost: false, reason: "RSVP required to post" };
  }

  // For city/country threads, any authenticated user can post
  return { canRead: true, canPost: true };
}
