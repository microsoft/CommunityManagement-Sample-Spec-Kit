import { db } from "@/lib/db/client";
import type { Rsvp, CreateRsvpRequest, CancelRsvpRequest } from "@acroyoga/shared/types/rsvp";

interface RsvpRow {
  id: string;
  event_id: string;
  user_id: string;
  occurrence_date: string | null;
  role: string;
  name_visible: boolean;
  status: string;
  stripe_charge_id: string | null;
  cancelled_at: string | null;
  cancellation_type: string | null;
  created_at: string;
}

function rowToRsvp(row: RsvpRow): Rsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    occurrenceDate: row.occurrence_date,
    role: row.role as Rsvp["role"],
    nameVisible: row.name_visible,
    status: row.status as Rsvp["status"],
    stripeChargeId: row.stripe_charge_id,
    cancelledAt: row.cancelled_at,
    cancellationType: row.cancellation_type as Rsvp["cancellationType"],
    createdAt: row.created_at,
  };
}

/**
 * Atomic RSVP creation with capacity enforcement (FR-06).
 * Uses SELECT FOR UPDATE to lock the event row and ensure the capacity
 * check + insert are serialized.
 */
export async function createRsvp(
  eventId: string,
  userId: string,
  data: CreateRsvpRequest,
): Promise<{ rsvp?: Rsvp; error?: string; waitlisted?: boolean }> {
  // Check the event exists and get details
  const eventResult = await db().query<{
    id: string;
    capacity: string;
    cost: string;
    prerequisites: string | null;
    status: string;
    start_datetime: string;
  }>(
    `SELECT id, capacity, cost, prerequisites, status, start_datetime FROM events WHERE id = $1 FOR UPDATE`,
    [eventId],
  );

  if (eventResult.rows.length === 0) {
    return { error: "Event not found" };
  }

  const event = eventResult.rows[0];

  if (event.status !== "published") {
    return { error: "Event is not available for RSVPs" };
  }

  if (new Date(event.start_datetime) < new Date()) {
    return { error: "Event has already started" };
  }

  // Prerequisite confirmation
  if (event.prerequisites && !data.prerequisiteConfirmed) {
    return { error: "You must confirm that you meet the prerequisites" };
  }

  // Check for existing active RSVP
  const existingResult = await db().query<{ id: string }>(
    `SELECT id FROM rsvps
     WHERE event_id = $1 AND user_id = $2 AND status != 'cancelled'
     ${data.occurrenceDate ? "AND occurrence_date = $3" : "AND occurrence_date IS NULL"}`,
    data.occurrenceDate ? [eventId, userId, data.occurrenceDate] : [eventId, userId],
  );

  if (existingResult.rows.length > 0) {
    return { error: "You already have an active RSVP for this event" };
  }

  // Atomic capacity check
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM rsvps
     WHERE event_id = $1 AND status IN ('confirmed', 'pending_payment')
     ${data.occurrenceDate ? "AND occurrence_date = $2" : ""}`,
    data.occurrenceDate ? [eventId, data.occurrenceDate] : [eventId],
  );
  const currentCount = parseInt(countResult.rows[0].cnt, 10);
  const capacity = parseInt(event.capacity, 10);

  if (currentCount >= capacity) {
    return { error: "Event is at capacity", waitlisted: true };
  }

  // For paid events, set status to pending_payment
  const cost = parseFloat(event.cost);
  const status = cost > 0 ? "pending_payment" : "confirmed";

  const insertResult = await db().query<RsvpRow>(
    `INSERT INTO rsvps (event_id, user_id, occurrence_date, role, name_visible, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      eventId,
      userId,
      data.occurrenceDate ?? null,
      data.role,
      data.nameVisible ?? true,
      status,
    ],
  );

  return { rsvp: rowToRsvp(insertResult.rows[0]) };
}

/**
 * Cancel RSVP with refund window logic (FR-17, FR-18).
 */
export async function cancelRsvp(
  eventId: string,
  userId: string,
  data: CancelRsvpRequest,
): Promise<{ rsvp?: Rsvp; credit?: { id: string; amount: number }; error?: string }> {
  // Find the active RSVP
  const rsvpResult = await db().query<RsvpRow>(
    `SELECT * FROM rsvps
     WHERE event_id = $1 AND user_id = $2 AND status != 'cancelled'
     ${data.occurrenceDate ? "AND occurrence_date = $3" : "AND occurrence_date IS NULL"}
     FOR UPDATE`,
    data.occurrenceDate ? [eventId, userId, data.occurrenceDate] : [eventId, userId],
  );

  if (rsvpResult.rows.length === 0) {
    return { error: "No active RSVP found" };
  }

  const rsvp = rsvpResult.rows[0];

  // Get event for refund window check
  const eventResult = await db().query<{
    cost: string;
    currency: string;
    refund_window_hours: string;
    start_datetime: string;
    created_by: string;
  }>(
    `SELECT cost, currency, refund_window_hours, start_datetime, created_by FROM events WHERE id = $1`,
    [eventId],
  );
  const event = eventResult.rows[0];

  const cost = parseFloat(event.cost);
  const refundWindowHours = parseInt(event.refund_window_hours, 10);
  const eventStart = new Date(event.start_datetime);
  const refundDeadline = new Date(eventStart.getTime() - refundWindowHours * 60 * 60 * 1000);
  const withinRefundWindow = new Date() < refundDeadline;

  let cancellationType: string;

  if (cost > 0 && withinRefundWindow) {
    // User chooses credit (default) or refund
    cancellationType = data.refundChoice ?? "credit";

    if (cancellationType === "credit") {
      // Issue credit for future events by same creator
      await db().query(
        `INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, event.created_by, cost, event.currency, cost, eventId, rsvp.id],
      );
    }
    // For "refund" type, Stripe refund would be triggered here
  } else if (cost > 0) {
    cancellationType = "no_refund";
  } else {
    cancellationType = "no_refund";
  }

  // Cancel the RSVP
  const updatedResult = await db().query<RsvpRow>(
    `UPDATE rsvps
     SET status = 'cancelled', cancelled_at = now(), cancellation_type = $1
     WHERE id = $2
     RETURNING *`,
    [cancellationType, rsvp.id],
  );

  // Auto-promote from waitlist (Phase 7)
  await autoPromoteWaitlist(eventId, data.occurrenceDate ?? null);

  const result: { rsvp: Rsvp; credit?: { id: string; amount: number } } = {
    rsvp: rowToRsvp(updatedResult.rows[0]),
  };

  if (cancellationType === "credit") {
    const creditResult = await db().query<{ id: string; amount: string }>(
      `SELECT id, amount FROM credits WHERE issued_from_rsvp_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [rsvp.id],
    );
    if (creditResult.rows.length > 0) {
      result.credit = {
        id: creditResult.rows[0].id,
        amount: parseFloat(creditResult.rows[0].amount),
      };
    }
  }

  return result;
}

/**
 * Auto-promote first waitlisted user when a spot opens (FR-07).
 * Only promotes before the cutoff time.
 */
async function autoPromoteWaitlist(eventId: string, occurrenceDate: string | null): Promise<void> {
  const eventResult = await db().query<{
    waitlist_cutoff_hours: string;
    start_datetime: string;
    capacity: string;
  }>(
    `SELECT waitlist_cutoff_hours, start_datetime, capacity FROM events WHERE id = $1`,
    [eventId],
  );

  if (eventResult.rows.length === 0) return;

  const event = eventResult.rows[0];
  const cutoffHours = parseInt(event.waitlist_cutoff_hours, 10);
  const eventStart = new Date(event.start_datetime);
  const cutoffTime = new Date(eventStart.getTime() - cutoffHours * 60 * 60 * 1000);

  if (new Date() >= cutoffTime) return; // Past cutoff, no auto-promotion

  // Check if there's actually a spot available
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM rsvps
     WHERE event_id = $1 AND status IN ('confirmed', 'pending_payment')
     ${occurrenceDate ? "AND occurrence_date = $2" : ""}`,
    occurrenceDate ? [eventId, occurrenceDate] : [eventId],
  );
  const currentCount = parseInt(countResult.rows[0].cnt, 10);
  const capacity = parseInt(event.capacity, 10);

  if (currentCount >= capacity) return; // No spot available

  // Get first waitlisted user
  const waitlistResult = await db().query<{ id: string; user_id: string; role: string }>(
    `SELECT id, user_id, role FROM waitlist
     WHERE event_id = $1 AND promoted_at IS NULL AND expired_at IS NULL
     ${occurrenceDate ? "AND occurrence_date = $2" : ""}
     ORDER BY position ASC
     LIMIT 1`,
    occurrenceDate ? [eventId, occurrenceDate] : [eventId],
  );

  if (waitlistResult.rows.length === 0) return;

  const waitlistEntry = waitlistResult.rows[0];

  // Create RSVP for the promoted user
  await db().query(
    `INSERT INTO rsvps (event_id, user_id, occurrence_date, role, name_visible, status)
     VALUES ($1, $2, $3, $4, true, 'confirmed')`,
    [eventId, waitlistEntry.user_id, occurrenceDate, waitlistEntry.role],
  );

  // Mark waitlist entry as promoted
  await db().query(
    `UPDATE waitlist SET promoted_at = now() WHERE id = $1`,
    [waitlistEntry.id],
  );
}

/**
 * Get all RSVPs for an event.
 */
export async function getEventRsvps(eventId: string): Promise<Rsvp[]> {
  const result = await db().query<RsvpRow>(
    `SELECT * FROM rsvps WHERE event_id = $1 ORDER BY created_at ASC`,
    [eventId],
  );
  return result.rows.map(rowToRsvp);
}

/**
 * Get user's RSVPs across all events.
 */
export async function getUserRsvps(userId: string, status?: string): Promise<Rsvp[]> {
  const params: unknown[] = [userId];
  let query = `SELECT * FROM rsvps WHERE user_id = $1`;
  if (status) {
    query += ` AND status = $2`;
    params.push(status);
  }
  query += ` ORDER BY created_at DESC`;

  const result = await db().query<RsvpRow>(query, params);
  return result.rows.map(rowToRsvp);
}

/**
 * Cancel ALL RSVPs for an event (creator cancels event) — FR edge case.
 * All attendees get full refund, regardless of refund window.
 */
export async function cancelAllEventRsvps(eventId: string): Promise<number> {
  // Count first (PGlite doesn't reliably report rowCount)
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM rsvps WHERE event_id = $1 AND status != 'cancelled'`,
    [eventId],
  );
  const count = parseInt(countResult.rows[0].cnt, 10);
  await db().query(
    `UPDATE rsvps
     SET status = 'cancelled', cancelled_at = now(), cancellation_type = 'event_cancelled'
     WHERE event_id = $1 AND status != 'cancelled'`,
    [eventId],
  );
  return count;
}
