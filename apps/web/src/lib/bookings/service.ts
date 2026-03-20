import { db } from "@/lib/db/client";
import { checkTicketCapacity } from "@/lib/events/capacity";
import type {
  Booking,
  BookingDetail,
  BookTicketRequest,
} from "@acroyoga/shared/types/recurring";

export async function createBooking(
  userId: string,
  data: BookTicketRequest,
): Promise<Booking> {
  // Check capacity (locks ticket type row)
  const { remaining } = await checkTicketCapacity(data.ticketTypeId);
  if (remaining <= 0) {
    throw new Error("Ticket type is sold out");
  }

  // Determine price
  const ticketResult = await db().query<{
    cost: string;
    concession_cost: string | null;
    group_id: string;
  }>(
    `SELECT cost, concession_cost, group_id FROM ticket_types WHERE id = $1`,
    [data.ticketTypeId],
  );
  const ticket = ticketResult.rows[0];
  if (!ticket) throw new Error("Ticket type not found");

  let amountPaid: number;
  if (data.pricingTier === "concession") {
    if (!ticket.concession_cost) {
      throw new Error("No concession pricing available for this ticket type");
    }
    // Verify user has approved concession status
    const concession = await db().query(
      `SELECT 1 FROM concession_statuses WHERE user_id = $1 AND status = 'approved'`,
      [userId],
    );
    if (concession.rows.length === 0) {
      throw new Error("User does not have approved concession status");
    }
    amountPaid = parseFloat(ticket.concession_cost);
  } else {
    amountPaid = parseFloat(ticket.cost);
  }

  // Apply credits if requested
  let creditsApplied = 0;
  if (data.useCredits) {
    const creditRows = await db().query<{ id: string; remaining_balance: string }>(
      `SELECT id, remaining_balance FROM credits WHERE user_id = $1 AND remaining_balance > 0 ORDER BY created_at FOR UPDATE`,
      [userId],
    );
    let toDeduct = amountPaid;
    for (const credit of creditRows.rows) {
      if (toDeduct <= 0) break;
      const available = parseFloat(credit.remaining_balance);
      const deduct = Math.min(available, toDeduct);
      await db().query(
        `UPDATE credits SET remaining_balance = remaining_balance - $2 WHERE id = $1`,
        [credit.id, deduct],
      );
      toDeduct -= deduct;
      creditsApplied += deduct;
    }
    amountPaid -= creditsApplied;
  }

  // Get currency from group
  const groupResult = await db().query<{ currency: string }>(
    `SELECT currency FROM event_groups WHERE id = $1`,
    [ticket.group_id],
  );
  const currency = groupResult.rows[0]?.currency ?? "USD";

  const result = await db().query<Booking>(
    `INSERT INTO bookings (ticket_type_id, user_id, pricing_tier, amount_paid, currency, credits_applied, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, ticket_type_id, user_id, pricing_tier, amount_paid, currency, credits_applied,
               payment_status, stripe_charge_id, cancellation_type, booked_at, cancelled_at`,
    [
      data.ticketTypeId,
      userId,
      data.pricingTier ?? "standard",
      amountPaid,
      currency,
      creditsApplied,
      amountPaid === 0 ? "completed" : "pending",
    ],
  );

  return result.rows[0];
}

export async function getBooking(bookingId: string): Promise<BookingDetail | null> {
  const result = await db().query<BookingDetail>(
    `SELECT b.id, b.ticket_type_id, b.user_id, b.pricing_tier, b.amount_paid, b.currency,
            b.credits_applied, b.payment_status, b.stripe_charge_id, b.cancellation_type,
            b.booked_at, b.cancelled_at,
            tt.name as ticket_type_name, eg.name as group_name
     FROM bookings b
     JOIN ticket_types tt ON tt.id = b.ticket_type_id
     JOIN event_groups eg ON eg.id = tt.group_id
     WHERE b.id = $1`,
    [bookingId],
  );
  return result.rows[0] ?? null;
}

export async function listUserBookings(userId: string): Promise<BookingDetail[]> {
  const result = await db().query<BookingDetail>(
    `SELECT b.id, b.ticket_type_id, b.user_id, b.pricing_tier, b.amount_paid, b.currency,
            b.credits_applied, b.payment_status, b.stripe_charge_id, b.cancellation_type,
            b.booked_at, b.cancelled_at,
            tt.name as ticket_type_name, eg.name as group_name
     FROM bookings b
     JOIN ticket_types tt ON tt.id = b.ticket_type_id
     JOIN event_groups eg ON eg.id = tt.group_id
     WHERE b.user_id = $1
     ORDER BY b.booked_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function cancelBooking(
  bookingId: string,
  cancellationType: "credit" | "refund" | "no_refund" | "event_cancelled",
): Promise<Booking | null> {
  // Load booking
  const existing = await db().query<Booking>(
    `SELECT id, user_id, credits_applied, payment_status FROM bookings WHERE id = $1`,
    [bookingId],
  );
  if (existing.rows.length === 0) return null;

  const booking = existing.rows[0];
  if (booking.payment_status === "cancelled" || booking.payment_status === "refunded") {
    throw new Error("Booking is already cancelled or refunded");
  }

  // Refund credits if any were used
  if (booking.credits_applied && parseFloat(String(booking.credits_applied)) > 0) {
    let toRefund = parseFloat(String(booking.credits_applied));
    const creditRows = await db().query<{ id: string; amount: string; remaining_balance: string }>(
      `SELECT id, amount, remaining_balance FROM credits WHERE user_id = $1 AND remaining_balance < amount ORDER BY created_at`,
      [booking.user_id],
    );
    for (const credit of creditRows.rows) {
      if (toRefund <= 0) break;
      const headroom = parseFloat(credit.amount) - parseFloat(credit.remaining_balance);
      const addBack = Math.min(headroom, toRefund);
      await db().query(
        `UPDATE credits SET remaining_balance = remaining_balance + $2 WHERE id = $1`,
        [credit.id, addBack],
      );
      toRefund -= addBack;
    }
  }

  const result = await db().query<Booking>(
    `UPDATE bookings
     SET payment_status = 'cancelled', cancellation_type = $2, cancelled_at = now()
     WHERE id = $1
     RETURNING id, ticket_type_id, user_id, pricing_tier, amount_paid, currency, credits_applied,
               payment_status, stripe_charge_id, cancellation_type, booked_at, cancelled_at`,
    [bookingId, cancellationType],
  );

  return result.rows[0] ?? null;
}

export async function completeBookingPayment(
  bookingId: string,
  stripeChargeId: string,
): Promise<Booking | null> {
  const result = await db().query<Booking>(
    `UPDATE bookings
     SET payment_status = 'completed', stripe_charge_id = $2
     WHERE id = $1 AND payment_status = 'pending'
     RETURNING id, ticket_type_id, user_id, pricing_tier, amount_paid, currency, credits_applied,
               payment_status, stripe_charge_id, cancellation_type, booked_at, cancelled_at`,
    [bookingId, stripeChargeId],
  );
  return result.rows[0] ?? null;
}
