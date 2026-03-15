import { db } from "@/lib/db/client";
import type { WaitlistEntry } from "@/types/rsvp";

interface WaitlistRow {
  id: string;
  event_id: string;
  user_id: string;
  occurrence_date: string | null;
  role: string;
  position: string;
  joined_at: string;
  promoted_at: string | null;
  expired_at: string | null;
}

function rowToEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    occurrenceDate: row.occurrence_date,
    role: row.role as WaitlistEntry["role"],
    position: parseInt(row.position, 10),
    joinedAt: row.joined_at,
    promotedAt: row.promoted_at,
    expiredAt: row.expired_at,
  };
}

export async function joinWaitlist(
  eventId: string,
  userId: string,
  role: string,
  occurrenceDate?: string,
): Promise<{ entry?: WaitlistEntry; error?: string }> {
  // Check event exists
  const eventResult = await db().query<{ id: string; status: string }>(
    "SELECT id, status FROM events WHERE id = $1",
    [eventId],
  );
  if (eventResult.rows.length === 0) return { error: "Event not found" };
  if (eventResult.rows[0].status !== "published") return { error: "Event is not available" };

  // Check not already on waitlist
  const existingResult = await db().query<{ id: string }>(
    `SELECT id FROM waitlist
     WHERE event_id = $1 AND user_id = $2 AND promoted_at IS NULL AND expired_at IS NULL
     ${occurrenceDate ? "AND occurrence_date = $3" : "AND occurrence_date IS NULL"}`,
    occurrenceDate ? [eventId, userId, occurrenceDate] : [eventId, userId],
  );
  if (existingResult.rows.length > 0) return { error: "Already on waitlist" };

  // Get next position
  const posResult = await db().query<{ max_pos: string }>(
    `SELECT COALESCE(MAX(position), 0) as max_pos FROM waitlist
     WHERE event_id = $1 AND promoted_at IS NULL AND expired_at IS NULL`,
    [eventId],
  );
  const nextPosition = parseInt(posResult.rows[0].max_pos, 10) + 1;

  const result = await db().query<WaitlistRow>(
    `INSERT INTO waitlist (event_id, user_id, occurrence_date, role, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [eventId, userId, occurrenceDate ?? null, role, nextPosition],
  );

  return { entry: rowToEntry(result.rows[0]) };
}

export async function getEventWaitlist(eventId: string): Promise<WaitlistEntry[]> {
  const result = await db().query<WaitlistRow>(
    `SELECT * FROM waitlist
     WHERE event_id = $1 AND promoted_at IS NULL AND expired_at IS NULL
     ORDER BY position ASC`,
    [eventId],
  );
  return result.rows.map(rowToEntry);
}

export async function leaveWaitlist(eventId: string, userId: string): Promise<boolean> {
  // Check existence first (PGlite doesn't reliably report rowCount)
  const existing = await db().query<{ id: string }>(
    `SELECT id FROM waitlist WHERE event_id = $1 AND user_id = $2 AND promoted_at IS NULL AND expired_at IS NULL`,
    [eventId, userId],
  );
  if (existing.rows.length === 0) return false;
  await db().query(
    `UPDATE waitlist SET expired_at = now()
     WHERE event_id = $1 AND user_id = $2 AND promoted_at IS NULL AND expired_at IS NULL`,
    [eventId, userId],
  );
  return true;
}
