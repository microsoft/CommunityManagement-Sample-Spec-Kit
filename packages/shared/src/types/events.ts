export type EventCategory = "jam" | "workshop" | "class" | "festival" | "social" | "retreat" | "teacher_training";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type EventStatus = "published" | "cancelled" | "draft";
export type AcroRole = "base" | "flyer" | "hybrid";

export interface EventSummary {
  id: string;
  title: string;
  startDatetime: string;
  endDatetime: string;
  venueName: string;
  cityName: string;
  citySlug: string;
  category: EventCategory;
  skillLevel: SkillLevel;
  cost: number;
  currency: string;
  capacity: number;
  confirmedCount: number;
  interestedCount: number;
  posterImageUrl: string | null;
  isExternal: boolean;
  isNew?: boolean;
  isUpdated?: boolean;
  userRsvpStatus?: string | null;
  userInterested?: boolean;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  prerequisites: string | null;
  concessionCost: number | null;
  refundWindowHours: number;
  waitlistCutoffHours: number;
  externalUrl: string | null;
  recurrenceRule: string | null;
  status: EventStatus;
  venue: VenueDetail;
  roleBreakdown: RoleBreakdown;
  attendees: AttendeePublic[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleBreakdown {
  base: number;
  flyer: number;
  hybrid: number;
  hint: string;
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

export interface ListEventsQuery {
  city?: string;
  category?: EventCategory;
  skillLevel?: SkillLevel;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListEventsResponse {
  events: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
  detectedCity?: string | null;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startDatetime: string;
  endDatetime: string;
  venueId: string;
  category: EventCategory;
  skillLevel: SkillLevel;
  prerequisites?: string;
  cost?: number;
  currency?: string;
  concessionCost?: number;
  capacity: number;
  refundWindowHours?: number;
  waitlistCutoffHours?: number;
  isExternal?: boolean;
  externalUrl?: string;
  posterImageUrl?: string;
  recurrenceRule?: string;
}

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
  concessionCost?: number;
  capacity?: number;
  refundWindowHours?: number;
  waitlistCutoffHours?: number;
  posterImageUrl?: string;
  recurrenceRule?: string;
}
