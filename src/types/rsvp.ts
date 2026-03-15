import type { AcroRole } from "./events";

export type RsvpStatus = "confirmed" | "cancelled" | "pending_payment";
export type CancellationType = "credit" | "refund" | "no_refund" | "event_cancelled";

export interface Rsvp {
  id: string;
  eventId: string;
  userId: string;
  occurrenceDate: string | null;
  role: AcroRole;
  nameVisible: boolean;
  status: RsvpStatus;
  stripeChargeId: string | null;
  cancelledAt: string | null;
  cancellationType: CancellationType | null;
  createdAt: string;
}

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

export interface CreateRsvpRequest {
  role: AcroRole;
  nameVisible?: boolean;
  occurrenceDate?: string;
  prerequisiteConfirmed?: boolean;
}

export interface CancelRsvpRequest {
  occurrenceDate?: string;
  refundChoice?: "credit" | "refund";
}

export interface JoinWaitlistRequest {
  role: AcroRole;
  occurrenceDate?: string;
}

export interface ToggleInterestResponse {
  interested: boolean;
  interestedCount: number;
}
