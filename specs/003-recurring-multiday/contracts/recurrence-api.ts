/**
 * API Contract: Recurrence & Occurrences
 * Spec 003 — Virtual occurrence expansion, occurrence overrides, series edit/cancel
 *
 * Base paths:
 *   /api/events/:id/occurrences
 *   /api/events/:id/occurrences/:date
 */

import type { EventDetail, EventSummary, AcroRole } from '../../001-event-discovery-rsvp/contracts/events-api';

// ─── Types ──────────────────────────────────────────────────────────

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export type DayOfWeek = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export type OverrideType = 'cancelled' | 'modified';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;               // e.g., 1 = every week, 2 = every other week
  daysOfWeek?: DayOfWeek[];       // for weekly: which days
  endDate?: string;               // ISO date — series ends after this date
  occurrenceCount?: number;       // series ends after N occurrences
}

export interface Occurrence {
  eventId: string;
  occurrenceDate: string;         // ISO date (YYYY-MM-DD)
  startDatetime: string;          // ISO 8601 (with timezone)
  endDatetime: string;
  isOverridden: boolean;          // true if occurrence has a 'modified' override
  isCancelled: boolean;           // true if occurrence has a 'cancelled' override
  /** Override-specific fields (merged onto base event) */
  venueId?: string;
  venueName?: string;
  capacity?: number;
  description?: string;
  /** RSVP stats for this occurrence */
  confirmedCount: number;
  waitlistCount: number;
  /** Present only for authenticated users */
  userRsvpStatus?: 'confirmed' | 'waitlisted' | null;
}

export interface OccurrenceOverride {
  id: string;
  eventId: string;
  occurrenceDate: string;         // ISO date
  overrideType: OverrideType;
  modifiedFields: Record<string, unknown> | null;
  cancelReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Allowed fields in modifiedFields JSON */
export interface OccurrenceModifiableFields {
  venue_id?: string;
  start_datetime?: string;        // ISO 8601
  end_datetime?: string;
  capacity?: number;
  description?: string;
}

// ─── GET /api/events/:id/occurrences — List upcoming occurrences ────

export interface ListOccurrencesQuery {
  from?: string;                  // ISO date (default: today)
  to?: string;                    // ISO date (default: today + horizon)
  includeCancelled?: boolean;     // default false
  page?: number;                  // 1-based, default 1
  pageSize?: number;              // default 12, max 52
}

export interface ListOccurrencesResponse {
  occurrences: Occurrence[];
  total: number;
  page: number;
  pageSize: number;
  horizonWeeks: number;           // server-side config value
}

/**
 * Auth: Public. Authenticated users get userRsvpStatus.
 * Behaviour: Expands the event's recurrence_rule within the requested window,
 *            merges occurrence_overrides, filters cancelled (unless includeCancelled),
 *            and attaches per-occurrence RSVP counts.
 * Errors: 404 (event not found), 400 (invalid date range)
 */

// ─── GET /api/events/:id/occurrences/:date — Single occurrence detail

export interface GetOccurrenceResponse {
  occurrence: Occurrence;
  /** Full event detail with override fields merged */
  event: EventDetail;
  /** Override record if one exists */
  override: OccurrenceOverride | null;
}

/**
 * Auth: Public. Authenticated users get personal RSVP status.
 * Errors: 404 (event not found or occurrence_date not in RRULE schedule)
 */

// ─── POST /api/events/:id/occurrences/:date/override — Create/update override

export interface CreateOverrideRequest {
  overrideType: OverrideType;
  /** Required when overrideType = 'modified' */
  modifiedFields?: OccurrenceModifiableFields;
  /** Optional when overrideType = 'cancelled' */
  cancelReason?: string;
  /** If true, notify all RSVP'd attendees for this occurrence */
  notifyAttendees?: boolean;      // default true
}

export interface CreateOverrideResponse {
  override: OccurrenceOverride;
  /** Count of attendees notified (for cancelled overrides) */
  attendeesNotified?: number;
}

/**
 * Auth: Event owner or scoped admin (via withPermission('editEvent', eventCity)).
 * Behaviour:
 *   - 'cancelled': Marks occurrence as cancelled. If RSVP'd attendees exist,
 *     queues cancellation notifications. Does NOT auto-refund (user must cancel RSVP).
 *   - 'modified': Stores field overrides. Existing RSVPs remain valid.
 * Errors: 400 (invalid fields), 403 (not owner/admin), 404 (event/date not found),
 *         409 (override already exists — use PUT to update)
 */

// ─── PUT /api/events/:id/occurrences/:date/override — Update override

export interface UpdateOverrideRequest {
  modifiedFields?: OccurrenceModifiableFields;
  cancelReason?: string;
  notifyAttendees?: boolean;
}

export interface UpdateOverrideResponse {
  override: OccurrenceOverride;
}

/**
 * Auth: Event owner or scoped admin.
 * Cannot change overrideType (cancel→modify or vice versa). Delete and recreate instead.
 * Errors: 400, 403, 404
 */

// ─── DELETE /api/events/:id/occurrences/:date/override — Remove override

export interface DeleteOverrideResponse {
  deleted: boolean;
}

/**
 * Auth: Event owner or scoped admin.
 * Restores the occurrence to its base event defaults.
 * Errors: 403, 404
 */

// ─── PATCH /api/events/:id/series — Edit series (all future occurrences)

export type SeriesEditScope = 'all_future' | 'single';

export interface EditSeriesRequest {
  /** Fields to update on the base event (affects all future occurrences) */
  updates: {
    title?: string;
    description?: string;
    startDatetime?: string;       // changes the time-of-day for future occurrences
    endDatetime?: string;
    venueId?: string;
    category?: string;
    skillLevel?: string;
    capacity?: number;
    recurrenceRule?: string;      // change the RRULE itself
  };
}

export interface EditSeriesResponse {
  event: EventDetail;
  /** Count of future overrides removed (if RRULE changed and overrides no longer align) */
  overridesRemoved: number;
}

/**
 * Auth: Event owner or scoped admin (via withPermission('editEvent', eventCity)).
 * Behaviour:
 *   - Updates the base event fields directly
 *   - Past overrides are preserved
 *   - If RRULE changes, future overrides misaligned with new schedule are removed
 * Errors: 400, 403, 404
 */

// ─── DELETE /api/events/:id/series — Cancel series (all future) ─────

export interface CancelSeriesRequest {
  /** If true, cancels ALL future occurrences. If false, cancels only the event (no recurrence). */
  cancelFutureOccurrences: boolean;
}

export interface CancelSeriesResponse {
  event: EventDetail;             // status = 'cancelled'
  occurrencesCancelled: number;   // count of future occurrences affected
  attendeesNotified: number;      // total attendees notified across all cancelled occurrences
  refundsInitiated: number;       // count of paid RSVPs being refunded
}

/**
 * Auth: Event owner or scoped admin.
 * Behaviour:
 *   - Sets event.status = 'cancelled'
 *   - All future occurrence RSVPs get cancellation notifications
 *   - Paid RSVPs: automatic Stripe refund (per Spec 001 creator-cancellation policy)
 *   - Waitlist entries for future occurrences are removed
 * Errors: 403, 404, 410 (already cancelled)
 */
