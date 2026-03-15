/**
 * API Contract: Reviews
 * Spec 005 — Post-event reviews with attendance verification and aggregate rating
 *
 * Base paths:
 *   /api/events/:id/reviews
 *   /api/teachers/:id/reviews
 */

import type { TeacherSpecialty } from './teachers-api';

// ─── Review Types ───────────────────────────────────────────────────

export interface Review {
  id: string;
  eventId: string;
  teacherProfileId: string;
  reviewerId: string;
  reviewerDisplayName: string;
  rating: number;               // 1–5
  text: string | null;
  reviewWindowClosesAt: string; // ISO 8601
  isHidden: boolean;            // true if moderated
  createdAt: string;
}

/** Public review — excludes moderated reviews and includes teacher/event context */
export interface PublicReview {
  id: string;
  rating: number;
  text: string | null;
  reviewerDisplayName: string;
  eventTitle: string;
  eventDate: string;
  createdAt: string;
}

// ─── POST /api/events/:id/reviews — Submit a review ─────────────────

export interface SubmitReviewRequest {
  teacherProfileId: string;
  rating: number;               // 1–5 integer
  text?: string;                // max 2000 chars, optional
}

export interface SubmitReviewResponse {
  review: Review;
  /** Updated aggregate for the teacher */
  teacherAggregate: {
    averageRating: number;
    reviewCount: number;
  };
}

/**
 * Auth: Authenticated member
 * Validation (all server-side, Principle IV):
 *  1. User has confirmed RSVP for this event (from rsvps table)
 *  2. Teacher was assigned to this event (from event_teachers table)
 *  3. Review window is open: event.end_datetime + 14 days > now()
 *     - For recurring events: uses occurrence end date
 *     - For multi-day events (Spec 003): uses last event day
 *  4. No duplicate review for this (event, teacher, reviewer) triple
 *  5. Rating is integer 1–5, text max 2000 chars
 *
 * On success:
 *  1. Insert review row with precomputed review_window_closes_at
 *  2. Recalculate teacher's aggregate rating (within same transaction)
 *  3. Cancel any pending review reminders for this (event, teacher, user)
 *
 * Errors:
 *  - 400: Validation errors (invalid rating, text too long)
 *  - 403: Not authenticated; OR "You can only review events you attended."
 *  - 404: Event or teacher not found
 *  - 409: "You have already reviewed this teacher for this event."
 *  - 410: "The review window for this event has closed."
 */

// ─── GET /api/events/:id/reviews — List reviews for an event ────────

export interface ListEventReviewsQuery {
  teacherProfileId?: string;    // filter to specific teacher
  page?: number;
  pageSize?: number;            // default: 20
}

export interface ListEventReviewsResponse {
  reviews: PublicReview[];
  total: number;
  page: number;
  pageSize: number;
  /** Aggregate for the event (or specific teacher if filtered) */
  aggregate: {
    averageRating: number | null;
    reviewCount: number;
  };
}

/**
 * Auth: Public
 * Excludes hidden reviews (moderated)
 * Errors: 404 (event not found)
 */

// ─── GET /api/teachers/:id/reviews — List reviews for a teacher ─────

export interface ListTeacherReviewsQuery {
  page?: number;
  pageSize?: number;            // default: 20
  sortBy?: 'recent' | 'highest' | 'lowest'; // default: 'recent'
}

export interface ListTeacherReviewsResponse {
  reviews: (PublicReview & {
    teacherRole: 'lead' | 'assistant';
  })[];
  total: number;
  page: number;
  pageSize: number;
  aggregate: {
    averageRating: number | null;
    reviewCount: number;
    distribution: {
      /** Count of reviews at each star level */
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

/**
 * Auth: Public
 * Excludes hidden reviews. For deleted teachers: reviews shown with "Deleted Teacher" name.
 * Errors: 404 (teacher not found)
 */

// ─── PATCH /api/teachers/:id/reviews/:reviewId — Moderate review ────

export interface ModerateReviewRequest {
  hidden: boolean;
  reason?: string;              // required when hiding
}

export interface ModerateReviewResponse {
  review: Review;
  /** Updated aggregate after moderation */
  teacherAggregate: {
    averageRating: number | null;
    reviewCount: number;
  };
}

/**
 * Auth: Scoped admin (via withPermission('moderateReviews', teacherScope))
 * On hide: sets hidden_at, hidden_by, hidden_reason; recalculates aggregate
 * On unhide: clears hidden_at/by/reason; recalculates aggregate
 *
 * Errors: 403 (not scoped admin), 404
 */

// ─── Review Window Helper (informational) ───────────────────────────

/**
 * Review window calculation logic (server-side):
 *
 * 1. Single event:
 *    reviewWindowClosesAt = event.end_datetime + 14 days
 *
 * 2. Recurring event (specific occurrence):
 *    occurrenceEnd = event start_time on occurrence_date + event duration
 *    reviewWindowClosesAt = occurrenceEnd + 14 days
 *
 * 3. Multi-day event group (Spec 003):
 *    Each event in the group has its own review window.
 *    The window for each event starts from that event's own end_datetime.
 *
 * The review_window_closes_at is stored on the review record for query efficiency.
 */
