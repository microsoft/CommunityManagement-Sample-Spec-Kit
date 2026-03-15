/**
 * API Contract: Events
 * Spec 001 — Event CRUD, listing, filtering, .ics export, OG metadata
 *
 * Base path: /api/events
 */

import type { PermissionAction } from '../../004-permissions-creator-accounts/contracts/permissions-api';

// ─── Enums ──────────────────────────────────────────────────────────

export type EventCategory =
  | 'jam'
  | 'workshop'
  | 'class'
  | 'festival'
  | 'social'
  | 'retreat'
  | 'teacher_training';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';

export type EventStatus = 'published' | 'cancelled' | 'draft';

export type AcroRole = 'base' | 'flyer' | 'hybrid';

// ─── Core Types ─────────────────────────────────────────────────────

export interface EventSummary {
  id: string;
  title: string;
  startDatetime: string;         // ISO 8601
  endDatetime: string;           // ISO 8601
  venueName: string;
  cityName: string;
  citySlug: string;
  category: EventCategory;
  skillLevel: SkillLevel;
  cost: number;                  // 0 for free
  currency: string;              // ISO 4217
  capacity: number;
  confirmedCount: number;        // active RSVPs
  interestedCount: number;
  posterImageUrl: string | null;
  isExternal: boolean;
  /** Present only for authenticated users */
  isNew?: boolean;               // created since user's last login (FR-09)
  isUpdated?: boolean;           // updated since user's last login (FR-09)
  /** Present only for authenticated users */
  userRsvpStatus?: 'confirmed' | 'waitlisted' | null;
  userInterested?: boolean;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  prerequisites: string | null;
  concessionCost: number | null;
  refundWindowHours: number;
  externalUrl: string | null;
  recurrenceRule: string | null;  // RFC 5545 RRULE — populated by Spec 003
  status: EventStatus;
  venue: VenueDetail;
  roleBreakdown: RoleBreakdown;
  /** Attendees who opted in to name visibility */
  attendees: AttendeePublic[];
  createdBy: string;             // userId
  createdAt: string;             // ISO 8601
  updatedAt: string;
}

export interface RoleBreakdown {
  base: number;
  flyer: number;
  hybrid: number;
  /** Hint text, e.g. "Flyers needed!" when imbalanced (FR-14) */
  hint: string | null;
}

export interface AttendeePublic {
  userId: string;
  displayName: string;
  role: AcroRole;
}

export interface VenueDetail {
  id: string;
  name: string;
  address: string;
  cityId: string;
  cityName: string;
  latitude: number;
  longitude: number;
  mapLinks: MapLinks;
}

export interface MapLinks {
  google: string;
  apple: string;
  osm: string;
  what3words: string;
}

// ─── GET /api/events — List/filter events ───────────────────────────

export interface ListEventsQuery {
  city?: string;               // city slug
  category?: string;           // comma-separated EventCategory values
  skillLevel?: string;         // comma-separated SkillLevel values
  dateFrom?: string;           // ISO date (YYYY-MM-DD)
  dateTo?: string;             // ISO date
  status?: string;             // comma-separated: new, full, past, booked, interested (OR logic, FR-12)
  q?: string;                  // free-text search (FR-13, P2)
  page?: number;               // 1-based, default 1
  pageSize?: number;           // default 20, max 100
}

export interface ListEventsResponse {
  events: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
  /** City auto-detected from geolocation, or null if no city filter applied */
  detectedCity: { slug: string; name: string } | null;
}

/** Auth: Public (Visitor). Authenticated users get freshness badges + personal status. */

// ─── POST /api/events — Create event ────────────────────────────────

export interface CreateEventRequest {
  title: string;
  description?: string;
  startDatetime: string;         // ISO 8601
  endDatetime: string;
  venueId: string;
  category: EventCategory;
  skillLevel: SkillLevel;
  prerequisites?: string;
  cost?: number;                 // default 0
  currency?: string;             // default 'GBP'
  concessionCost?: number;
  capacity: number;
  refundWindowHours?: number;    // default 24
  waitlistCutoffHours?: number;  // default 2
  isExternal?: boolean;
  externalUrl?: string;
  posterImageUrl?: string;
  recurrenceRule?: string;       // Spec 003 — ignored if null
}

export interface CreateEventResponse {
  event: EventDetail;
}

/** Auth: Event Creator or higher (via withPermission('createEvent', venueCity)).
 *  Errors: 400 (validation), 403 (no permission), 404 (venue not found) */

// ─── GET /api/events/:id — Event detail ─────────────────────────────

export interface GetEventResponse {
  event: EventDetail;
}

/** Auth: Public. Authenticated users get additional fields (userRsvpStatus, etc.) */

// ─── PATCH /api/events/:id — Edit event ─────────────────────────────

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startDatetime?: string;
  endDatetime?: string;
  venueId?: string;
  category?: EventCategory;
  skillLevel?: SkillLevel;
  prerequisites?: string;
  cost?: number;
  currency?: string;
  concessionCost?: number;
  capacity?: number;
  refundWindowHours?: number;
  waitlistCutoffHours?: number;
  posterImageUrl?: string;
}

export interface UpdateEventResponse {
  event: EventDetail;
}

/** Auth: Event owner or scoped admin (via withPermission('editEvent', eventCity)).
 *  Edge case: reducing capacity below current RSVPs does NOT remove RSVPs — shows warning.
 *  Errors: 400, 403, 404 */

// ─── DELETE /api/events/:id — Cancel event ──────────────────────────

export interface CancelEventResponse {
  event: EventDetail;            // status = 'cancelled'
  refundsInitiated: number;      // count of paid RSVPs being refunded
}

/** Auth: Event owner or scoped admin.
 *  Side effects: All active RSVPs cancelled. Paid RSVPs receive automatic Stripe refund.
 *  Notifications sent to all attendees + interested users.
 *  Errors: 403, 404, 409 (already cancelled) */

// ─── GET /api/events/:id/ics — Calendar file ────────────────────────

/** Returns: Content-Type: text/calendar
 *  Content-Disposition: attachment; filename={slug}.ics
 *  Auth: Public */
