/**
 * API Contract: RSVP, Waitlist & Interest
 * Spec 001 — RSVP with role selection, capacity enforcement, waitlist, interest toggle
 *
 * Base paths:
 *   /api/events/:id/rsvp
 *   /api/events/:id/waitlist
 *   /api/events/:id/interest
 */

import type { AcroRole, EventDetail } from './events-api';

// ─── RSVP Types ─────────────────────────────────────────────────────

export type RsvpStatus = 'confirmed' | 'cancelled' | 'pending_payment';

export type CancellationType = 'credit' | 'refund' | 'no_refund' | 'event_cancelled';

export interface Rsvp {
  id: string;
  eventId: string;
  userId: string;
  occurrenceDate: string | null;  // ISO date — for recurring events (Spec 003)
  role: AcroRole;
  nameVisible: boolean;
  status: RsvpStatus;
  stripeChargeId: string | null;
  cancelledAt: string | null;
  cancellationType: CancellationType | null;
  createdAt: string;              // ISO 8601
}

// ─── POST /api/events/:id/rsvp — Create RSVP ───────────────────────

export interface CreateRsvpRequest {
  role: AcroRole;
  nameVisible?: boolean;          // default true
  occurrenceDate?: string;        // ISO date — for recurring events (Spec 003)
  prerequisiteConfirmed?: boolean; // required true when event has prerequisites
}

export interface CreateRsvpResponse {
  rsvp: Rsvp;
  /** Present only for paid events — total charged (after credit application) */
  payment?: {
    amountCharged: number;        // amount actually sent to Stripe (0 if fully covered by credits)
    creditsApplied: number;       // amount covered by credits
    currency: string;
    stripeChargeId: string | null; // null if fully covered by credits
  };
}

/**
 * Auth: Authenticated member (via withPermission('rsvp', ...)).
 * Flow:
 *  1. Validate request (Zod)
 *  2. Check prerequisites confirmed if event requires them
 *  3. BEGIN transaction
 *  4. SELECT event FOR UPDATE (lock capacity)
 *  5. COUNT active RSVPs
 *  6. If at capacity → reject (return waitlist option)
 *  7. If paid event → apply credits (FIFO), charge remainder via Stripe Connect
 *  8. INSERT RSVP
 *  9. COMMIT
 *  10. Queue RSVP confirmation notification
 *
 * Errors: 400 (validation, prerequisites not confirmed), 403 (not authenticated),
 *         404 (event not found), 409 (already RSVP'd), 410 (event cancelled),
 *         422 (event full — use waitlist)
 */

// ─── DELETE /api/events/:id/rsvp — Cancel RSVP ─────────────────────

export interface CancelRsvpRequest {
  occurrenceDate?: string;        // for recurring events
  /** Required for paid events within refund window */
  refundChoice?: 'credit' | 'refund';
}

export interface CancelRsvpResponse {
  rsvp: Rsvp;                     // updated with cancelled status
  /** Present only for paid events within refund window */
  refundResult?: {
    type: 'credit' | 'refund' | 'no_refund';
    amount: number;
    currency: string;
    creditId?: string;           // present if type = 'credit'
    stripeRefundId?: string;     // present if type = 'refund'
  };
  /** Present if a waitlisted user was auto-promoted */
  waitlistPromotion?: {
    promotedUserId: string;
    position: number;
  };
}

/**
 * Auth: Authenticated member (must be the RSVP owner).
 * Flow:
 *  1. Load RSVP and event
 *  2. Determine refund eligibility: now < event.startDatetime - refundWindowHours?
 *  3. If within window + paid event → apply refundChoice (credit preferred/default)
 *  4. Mark RSVP as cancelled
 *  5. Attempt waitlist auto-promotion (if before cutoff time)
 *  6. Queue notification to cancelled user + promoted user (if any)
 *
 * Errors: 403, 404 (no active RSVP), 409 (already cancelled)
 */

// ─── Waitlist Types ─────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string;
  eventId: string;
  userId: string;
  occurrenceDate: string | null;
  role: AcroRole;
  position: number;
  joinedAt: string;
  promotedAt: string | null;
  expiredAt: string | null;
}

// ─── POST /api/events/:id/waitlist — Join waitlist ──────────────────

export interface JoinWaitlistRequest {
  role: AcroRole;
  occurrenceDate?: string;       // for recurring events
}

export interface JoinWaitlistResponse {
  entry: WaitlistEntry;
}

/**
 * Auth: Authenticated member.
 * Prerequisites: Event must be at capacity. User must not have active RSVP or waitlist entry.
 * Errors: 400, 403, 404, 409 (already waitlisted or RSVP'd), 422 (event not full — use RSVP)
 */

// ─── DELETE /api/events/:id/waitlist — Leave waitlist ───────────────

export interface LeaveWaitlistRequest {
  occurrenceDate?: string;
}

export interface LeaveWaitlistResponse {
  removed: boolean;
}

/** Auth: Authenticated member (must be the waitlist entry owner).
 *  Side effect: positions after the removed entry are NOT renumbered (gaps are OK).
 *  Errors: 403, 404 (not on waitlist) */

// ─── POST /api/events/:id/interest — Toggle interest ────────────────

export interface ToggleInterestResponse {
  interested: boolean;           // true if now interested, false if removed
  interestedCount: number;       // updated count
}

/**
 * Auth: Authenticated member.
 * Idempotent toggle: if interested → remove; if not → add.
 * Note: Interest is NOT removed when user RSVPs (spec edge case — retained for tracking).
 * Errors: 403, 404
 */
