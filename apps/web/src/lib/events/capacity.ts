import { db } from "@/lib/db/client";

/**
 * Check if an event occurrence has capacity for new RSVPs/bookings.
 * Uses SELECT FOR UPDATE on the event row for concurrency safety.
 * For recurring events, counts RSVPs for the specific occurrence_date.
 */
export async function checkCapacity(
  eventId: string,
  occurrenceDate?: string,
): Promise<{ capacity: number; used: number; remaining: number }> {
  // Lock the event row
  const eventResult = await db().query<{ capacity: number }>(
    `SELECT capacity FROM events WHERE id = $1 FOR UPDATE`,
    [eventId],
  );

  if (eventResult.rows.length === 0) {
    throw new Error(`Event ${eventId} not found`);
  }

  const capacity = eventResult.rows[0].capacity;

  // Count confirmed RSVPs for this event/occurrence
  let countQuery: string;
  let countParams: unknown[];

  if (occurrenceDate) {
    countQuery = `SELECT COUNT(*)::text as count FROM rsvps
                  WHERE event_id = $1 AND occurrence_date = $2 AND status = 'confirmed'`;
    countParams = [eventId, occurrenceDate];
  } else {
    countQuery = `SELECT COUNT(*)::text as count FROM rsvps
                  WHERE event_id = $1 AND status = 'confirmed'`;
    countParams = [eventId];
  }

  const countResult = await db().query<{ count: string }>(countQuery, countParams);
  const used = parseInt(countResult.rows[0].count, 10);

  return { capacity, used, remaining: capacity - used };
}

/**
 * Check ticket type capacity for group bookings.
 */
export async function checkTicketCapacity(
  ticketTypeId: string,
): Promise<{ capacity: number; sold: number; remaining: number }> {
  const ticketResult = await db().query<{ capacity: number }>(
    `SELECT capacity FROM ticket_types WHERE id = $1 FOR UPDATE`,
    [ticketTypeId],
  );

  if (ticketResult.rows.length === 0) {
    throw new Error(`Ticket type ${ticketTypeId} not found`);
  }

  const capacity = ticketResult.rows[0].capacity;

  const soldResult = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM bookings
     WHERE ticket_type_id = $1 AND payment_status NOT IN ('cancelled', 'refunded')`,
    [ticketTypeId],
  );
  const sold = parseInt(soldResult.rows[0].count, 10);

  return { capacity, sold, remaining: capacity - sold };
}
