/**
 * API Contract: Bookings
 * Spec 003 — Group ticket booking, cancellation, upgrade flow
 *
 * Base paths:
 *   /api/bookings
 *   /api/event-groups/:groupId/book
 */

import type { CreditApplication } from '../../001-event-discovery-rsvp/contracts/credits-api';

// ─── Types ──────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'cancelled' | 'pending_payment';

export type PricingTier = 'standard' | 'concession';

export type BookingCancellationType = 'credit' | 'refund' | 'no_refund';

export interface Booking {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  groupId: string;
  groupName: string;
  userId: string;
  pricingTier: PricingTier;
  amountPaid: number;
  currency: string;               // ISO 4217
  creditsApplied: number;
  stripeChargeId: string | null;
  status: BookingStatus;
  cancelledAt: string | null;
  cancellationType: BookingCancellationType | null;
  bookedAt: string;               // ISO 8601
  /** Events covered by this booking */
  coveredEvents: BookingCoveredEvent[];
}

export interface BookingCoveredEvent {
  eventId: string;
  eventTitle: string;
  eventDate: string;              // ISO date
  venueName: string;
}

// ─── POST /api/event-groups/:groupId/book — Book a ticket ───────────

export interface CreateBookingRequest {
  ticketTypeId: string;
  /** Explicitly request concession pricing. Server verifies eligibility. */
  requestConcession?: boolean;     // default false
}

export interface CreateBookingResponse {
  booking: Booking;
  /** Payment details */
  payment: {
    amountCharged: number;         // amount sent to Stripe (0 if fully covered by credits)
    creditsApplied: number;
    currency: string;
    stripeChargeId: string | null;
    pricingTier: PricingTier;
    /** Breakdown of applied credits */
    creditApplication: CreditApplication | null;
  };
}

/**
 * Auth: Authenticated member.
 * Flow:
 *  1. Validate request (Zod)
 *  2. Load ticket type, group, and member events
 *  3. Verify user has no active booking for this ticket type
 *  4. BEGIN transaction
 *  5. Lock all covered event rows (SELECT FOR UPDATE, ordered by ID)
 *  6. For each covered event: compute effective attendee count (individual RSVPs + group bookings)
 *     - If any event is at capacity → reject with specific day information
 *  7. Check ticket type pool capacity (if set)
 *  8. Determine pricing tier:
 *     - If requestConcession AND user has approved concession status AND ticket has concessionCost
 *       → concession tier
 *     - Otherwise → standard tier
 *  9. Auto-apply credits (from Spec 001, FIFO, scoped to group creator)
 *  10. Charge remainder via Stripe Connect (direct charge to group creator)
 *  11. INSERT booking
 *  12. COMMIT
 *  13. Queue booking confirmation notification
 *
 * Errors: 400 (validation), 403 (not authenticated), 404 (group/ticket not found),
 *         409 (already booked), 422 (capacity exceeded — includes which day is full)
 */

// ─── GET /api/bookings — List user's bookings ──────────────────────

export interface ListBookingsQuery {
  status?: BookingStatus;          // filter by status
  page?: number;
  pageSize?: number;               // default 20
}

export interface ListBookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  pageSize: number;
}

/** Auth: Authenticated member (returns only the caller's bookings). */

// ─── GET /api/bookings/:id — Booking detail ─────────────────────────

export interface GetBookingResponse {
  booking: Booking;
  /** Refund eligibility info */
  cancellation: {
    eligible: boolean;
    /** If eligible, which options are available */
    options: BookingCancellationType[];
    /** Earliest covered event start, used for refund window calculation */
    earliestEventStart: string;    // ISO 8601
    refundWindowHours: number;
    /** Reason if not eligible */
    reason?: 'past_refund_window' | 'already_cancelled' | 'event_started';
  };
}

/** Auth: Authenticated member (must be the booking owner). */

// ─── DELETE /api/bookings/:id — Cancel booking ─────────────────────

export interface CancelBookingRequest {
  /** Required for paid bookings within refund window */
  refundChoice?: 'credit' | 'refund';
}

export interface CancelBookingResponse {
  booking: Booking;                // updated with cancelled status
  /** Present for paid bookings within refund window */
  refundResult?: {
    type: BookingCancellationType;
    amount: number;
    currency: string;
    creditId?: string;            // present if type = 'credit'
    stripeRefundId?: string;      // present if type = 'refund'
  };
  /** Capacity released on each covered event */
  capacityReleased: Array<{
    eventId: string;
    eventTitle: string;
    newRemainingCapacity: number;
  }>;
}

/**
 * Auth: Authenticated member (must be the booking owner).
 * Flow:
 *  1. Load booking, ticket type, group, and covered events
 *  2. Determine refund eligibility:
 *     refundWindow = earliest covered event start - refundWindowHours (from event)
 *     eligible = now < refundWindow
 *  3. BEGIN transaction
 *  4. Mark booking as cancelled
 *  5. Release capacity on all covered events
 *  6. If within refund window:
 *     a. refundChoice = 'credit' → issue credit (amount = booking price, scoped to group creator)
 *     b. refundChoice = 'refund' → Stripe refund via Connect
 *  7. COMMIT
 *  8. Queue cancellation notification
 *
 * Note: Combined passes are ATOMIC — the entire booking is cancelled.
 *       No partial day drop. User must cancel and rebook individual days.
 *
 * Errors: 403, 404, 409 (already cancelled), 410 (event already started)
 */
