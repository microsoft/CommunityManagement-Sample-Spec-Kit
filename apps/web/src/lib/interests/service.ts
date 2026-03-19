import { db } from "@/lib/db/client";

export async function toggleInterest(
  eventId: string,
  userId: string,
): Promise<{ interested: boolean; count: number }> {
  // Check if already interested
  const existing = await db().query<{ id: string }>(
    "SELECT id FROM event_interests WHERE event_id = $1 AND user_id = $2",
    [eventId, userId],
  );

  if (existing.rows.length > 0) {
    // Remove interest
    await db().query("DELETE FROM event_interests WHERE event_id = $1 AND user_id = $2", [eventId, userId]);
  } else {
    // Add interest
    await db().query(
      "INSERT INTO event_interests (event_id, user_id) VALUES ($1, $2)",
      [eventId, userId],
    );
  }

  // Get updated count
  const countResult = await db().query<{ cnt: string }>(
    "SELECT COUNT(*) as cnt FROM event_interests WHERE event_id = $1",
    [eventId],
  );

  return {
    interested: existing.rows.length === 0,
    count: parseInt(countResult.rows[0].cnt, 10),
  };
}

export async function getUserInterests(userId: string): Promise<string[]> {
  const result = await db().query<{ event_id: string }>(
    "SELECT event_id FROM event_interests WHERE user_id = $1",
    [userId],
  );
  return result.rows.map((r) => r.event_id);
}

export async function isInterested(eventId: string, userId: string): Promise<boolean> {
  const result = await db().query<{ id: string }>(
    "SELECT id FROM event_interests WHERE event_id = $1 AND user_id = $2",
    [eventId, userId],
  );
  return result.rows.length > 0;
}
