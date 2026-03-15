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
  isCancelled: boolean;
  isModified: boolean;
  modifiedFields?: Record<string, unknown>;
}

export interface OccurrenceOverride {
  id: string;
  eventId: string;
  occurrenceDate: string;
  overrideType: "cancelled" | "modified";
  modifiedFields: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
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
  startDate: string;
  endDate: string;
  currency: string;
  posterImageUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventGroupMember {
  id: string;
  groupId: string;
  eventId: string;
  sortOrder: number;
}

export interface TicketType {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  cost: number;
  concessionCost: number | null;
  capacity: number;
  coversAllEvents: boolean;
  coveredEventIds: string[];
  createdAt: string;
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
  ticketTypeId: string;
  userId: string;
  pricingTier: PricingTier;
  amountPaid: number;
  currency: string;
  creditsApplied: number;
  paymentStatus: BookingStatus;
  stripeChargeId: string | null;
  cancelledAt: string | null;
  cancellationType: string | null;
  bookedAt: string;
}

export interface BookingDetail extends Booking {
  ticketTypeName: string;
  groupId: string;
  groupName: string;
  coveredEventIds: string[];
  cancellationEligible: boolean;
}

// --- Concessions ---
export type ConcessionStatusValue = "pending" | "approved" | "rejected" | "revoked";

export interface ConcessionStatus {
  id: string;
  userId: string;
  status: ConcessionStatusValue;
  evidence: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// --- API Request/Response types ---
export interface CreateOccurrenceOverrideRequest {
  overrideType: "cancelled" | "modified";
  modifiedFields?: OccurrenceModifiableFields;
}

export interface UpdateOccurrenceOverrideRequest {
  modifiedFields: OccurrenceModifiableFields;
}

export interface SeriesEditRequest {
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
  description?: string;
  startDate?: string;
  endDate?: string;
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
}

export interface UpdateTicketTypeRequest {
  name?: string;
  description?: string;
  cost?: number;
  concessionCost?: number;
  capacity?: number;
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
