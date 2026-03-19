/**
 * API Contract: Event Groups
 * Spec 003 — Event groups (festival/combo/series), ticket types, group management
 *
 * Base paths:
 *   /api/event-groups
 *   /api/event-groups/:id
 *   /api/event-groups/:id/ticket-types
 */

import type { EventSummary } from '../../001-event-discovery-rsvp/contracts/events-api';

// ─── Enums ──────────────────────────────────────────────────────────

export type EventGroupType = 'festival' | 'combo' | 'series';

// ─── Core Types ─────────────────────────────────────────────────────

export interface EventGroupSummary {
  id: string;
  name: string;
  slug: string;
  type: EventGroupType;
  description: string | null;
  startDate: string;              // ISO date
  endDate: string;                // ISO date
  currency: string;               // ISO 4217
  posterImageUrl: string | null;
  memberEventCount: number;
  /** Cheapest ticket price (for display in listings) */
  priceFrom: number | null;       // null for series (no ticketing)
  createdBy: string;
  createdAt: string;
}

export interface EventGroupDetail extends EventGroupSummary {
  memberEvents: EventGroupMemberDetail[];
  ticketTypes: TicketTypeSummary[];
}

export interface EventGroupMemberDetail {
  eventId: string;
  sortOrder: number;
  event: EventSummary;
}

export interface TicketTypeSummary {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  cost: number;
  concessionCost: number | null;
  currency: string;               // inherited from group
  capacity: number | null;
  soldCount: number;              // active bookings
  remainingCapacity: number | null; // null if unlimited
  coversAllEvents: boolean;
  coveredEventIds: string[];      // event IDs this ticket covers
  sortOrder: number;
  /** Availability status derived from capacity checks */
  available: boolean;
  /** Reason for unavailability (if not available) */
  unavailableReason?: 'sold_out' | 'day_full';
}

// ─── GET /api/event-groups — List event groups ──────────────────────

export interface ListEventGroupsQuery {
  type?: EventGroupType;
  city?: string;                  // filter by city slug (any member event in that city)
  dateFrom?: string;              // ISO date
  dateTo?: string;                // ISO date
  page?: number;
  pageSize?: number;              // default 20, max 50
}

export interface ListEventGroupsResponse {
  groups: EventGroupSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** Auth: Public (Visitor). */

// ─── POST /api/event-groups — Create event group ────────────────────

export interface CreateEventGroupRequest {
  name: string;
  type: EventGroupType;
  description?: string;
  startDate: string;              // ISO date
  endDate: string;                // ISO date
  currency: string;               // ISO 4217
  posterImageUrl?: string;
  /** Event IDs to include as members (must be owned by the caller) */
  memberEventIds: string[];
}

export interface CreateEventGroupResponse {
  group: EventGroupDetail;
}

/**
 * Auth: Event Creator or higher (via withPermission('createEvent', scope)).
 * Validation:
 *   - All member events must be owned by the caller
 *   - All member events must share the same currency
 *   - For festivals: event dates must fall within group date range (warning, not error)
 * Errors: 400 (validation), 403 (no permission), 404 (member event not found),
 *         409 (event already in a festival/combo group)
 */

// ─── GET /api/event-groups/:id — Group detail ───────────────────────

export interface GetEventGroupResponse {
  group: EventGroupDetail;
}

/** Auth: Public. */

// ─── PATCH /api/event-groups/:id — Update group ─────────────────────

export interface UpdateEventGroupRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  posterImageUrl?: string;
  /** Add or remove members */
  addEventIds?: string[];
  removeEventIds?: string[];
}

export interface UpdateEventGroupResponse {
  group: EventGroupDetail;
}

/**
 * Auth: Group owner or scoped admin.
 * Validation: Same as creation for new member events.
 * Cannot change type or currency after creation (to prevent ticket type inconsistency).
 * Errors: 400, 403, 404
 */

// ─── DELETE /api/event-groups/:id — Delete group ────────────────────

export interface DeleteEventGroupResponse {
  deleted: boolean;
  /** Active bookings that need cancellation/refund */
  activeBookingsCancelled: number;
  refundsInitiated: number;
}

/**
 * Auth: Group owner or scoped admin.
 * Behaviour:
 *   - Cascades: removes group, members, ticket types, and cancels active bookings
 *   - Active bookings get automatic refund (creator-cancellation policy per Spec 001)
 *   - Member events remain as standalone events (not deleted)
 * Errors: 403, 404
 */

// ─── POST /api/event-groups/:id/ticket-types — Create ticket type ───

export interface CreateTicketTypeRequest {
  name: string;
  description?: string;
  cost: number;
  concessionCost?: number;        // null = no concession option
  capacity?: number;              // null = unlimited
  coversAllEvents: boolean;
  /** Required when coversAllEvents = false. Event IDs this ticket covers. */
  coveredEventIds?: string[];
}

export interface CreateTicketTypeResponse {
  ticketType: TicketTypeSummary;
}

/**
 * Auth: Group owner or scoped admin.
 * Validation:
 *   - Group type must be 'festival' or 'combo' (series have no ticketing)
 *   - coveredEventIds must be member events of this group
 *   - concessionCost must be <= cost
 *   - cost >= 0
 * Errors: 400, 403, 404, 422 (group type is 'series')
 */

// ─── PATCH /api/event-groups/:id/ticket-types/:ticketTypeId — Update

export interface UpdateTicketTypeRequest {
  name?: string;
  description?: string;
  cost?: number;
  concessionCost?: number | null;
  capacity?: number | null;
  coversAllEvents?: boolean;
  coveredEventIds?: string[];
}

export interface UpdateTicketTypeResponse {
  ticketType: TicketTypeSummary;
}

/**
 * Auth: Group owner or scoped admin.
 * Edge case: Reducing capacity below sold count shows warning but does NOT cancel bookings.
 * Errors: 400, 403, 404
 */

// ─── DELETE /api/event-groups/:id/ticket-types/:ticketTypeId — Delete

export interface DeleteTicketTypeResponse {
  deleted: boolean;
  activeBookingsCancelled: number;
  refundsInitiated: number;
}

/**
 * Auth: Group owner or scoped admin.
 * Behaviour: Cancels active bookings for this ticket type with automatic refund.
 * Errors: 403, 404
 */
