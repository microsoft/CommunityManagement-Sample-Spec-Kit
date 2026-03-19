/* Types for Spec 003: Recurring & Multi-Day Events */

// --- Recurrence ---
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";
export type DayOfWeek = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
export type SeriesEditScope = "single" | "all_future";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: DayOfWeek[];
  endDate?: string;       // ISO date
  occurrenceCount?: number;
}

export interface Occurrence {
  eventId: string;
  date: string;           // ISO date (YYYY-MM-DD)
  startDatetime: string;  // ISO datetime with occurrence date applied
  endDatetime: string;
  title?: string;
  capacity?: number;
  isCancelled: boolean;
  isModified: boolean;
  rsvpCount?: number;
  modifiedFields?: Record<string, unknown>;
}

export interface OccurrenceOverride {
  id: string;
  event_id: string;
  occurrence_date: string;
  override_type: "cancelled" | "modified";
  modified_fields: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export type OccurrenceModifiableFields = {
  title?: string;
  description?: string;
  startTime?: string;      // HH:mm time override
  endTime?: string;
  venueId?: string;
  capacity?: number;
  cost?: number;
  concessionCost?: number;
};

// --- Event Groups ---
export type EventGroupType = "festival" | "combo" | "series";

export interface EventGroup {
  id: string;
  name: string;
  type: EventGroupType;
  description: string | null;
  start_date: string;
  end_date: string;
  currency: string;
  poster_image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventGroupMember {
  id: string;
  group_id: string;
  event_id: string;
  sort_order: number;
}

export interface TicketType {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  cost: number;
  concession_cost: number | null;
  capacity: number;
  covers_all_events: boolean;
  covered_event_ids: string[];
  created_at: string;
}

export interface TicketTypeAvailability extends TicketType {
  sold: number;
  available: number;
}

// --- Bookings ---
export type BookingStatus = "pending" | "completed" | "cancelled" | "refunded";
export type PricingTier = "standard" | "concession";

export interface Booking {
  id: string;
  ticket_type_id: string;
  user_id: string;
  pricing_tier: PricingTier;
  amount_paid: number;
  currency: string;
  credits_applied: number;
  payment_status: BookingStatus;
  stripe_charge_id: string | null;
  cancelled_at: string | null;
  cancellation_type: string | null;
  booked_at: string;
}

export interface BookingDetail extends Booking {
  ticket_type_name: string;
  group_id: string;
  group_name: string;
  covered_event_ids: string[];
  cancellation_eligible: boolean;
}

// --- Concessions ---
export type ConcessionStatusValue = "pending" | "approved" | "rejected" | "revoked";

export interface ConcessionStatus {
  id: string;
  user_id: string;
  status: ConcessionStatusValue;
  evidence: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  created_at: string;
}

// --- API Request/Response types ---
export interface CreateOccurrenceOverrideRequest {
  overrideType: "cancelled" | "modified";
  modifiedFields?: OccurrenceModifiableFields;
}

export interface UpdateOccurrenceOverrideRequest {
  overrideType?: "cancelled" | "modified";
  modifiedFields?: OccurrenceModifiableFields;
}

export interface SeriesEditRequest {
  scope: "all" | "this" | "thisAndFuture";
  occurrenceDate?: string;
  changes: Record<string, unknown>;
  title?: string;
  description?: string;
  capacity?: number;
  cost?: number;
  concessionCost?: number;
  venueId?: string;
  recurrenceRule?: string;
}

export interface CreateEventGroupRequest {
  name: string;
  type: EventGroupType;
  description?: string;
  startDate: string;
  endDate: string;
  currency: string;
  posterImageUrl?: string;
  eventIds: string[];
}

export interface UpdateEventGroupRequest {
  name?: string;
  type?: EventGroupType;
  description?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  posterImageUrl?: string;
  eventIds?: string[];
  addEventIds?: string[];
  removeEventIds?: string[];
}

export interface CreateTicketTypeRequest {
  name: string;
  description?: string;
  cost: number;
  concessionCost?: number;
  capacity: number;
  coversAllEvents: boolean;
  coveredEventIds?: string[];
  eventIds?: string[];
}

export interface UpdateTicketTypeRequest {
  name?: string;
  description?: string;
  cost?: number;
  concessionCost?: number;
  capacity?: number;
  coversAllEvents?: boolean;
  eventIds?: string[];
}

export interface BookTicketRequest {
  ticketTypeId: string;
  pricingTier?: PricingTier;
  useCredits?: boolean;
}

export interface ConcessionApplicationRequest {
  evidence?: string;
}

export interface ReviewConcessionRequest {
  action: "approve" | "reject" | "revoke";
}

export interface ListOccurrencesQuery {
  from?: string;
  to?: string;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
}
