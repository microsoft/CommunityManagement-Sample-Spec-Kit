// Notification types — Spec 015

// ─── Enums ───────────────────────────────────────────────

export enum NotificationType {
  // Events
  EVENT_RSVP = "event_rsvp",
  WAITLIST_PROMOTION = "waitlist_promotion",
  EVENT_CANCELLATION = "event_cancellation",
  OCCURRENCE_CANCELLATION = "occurrence_cancellation",

  // Teachers & Reviews
  REVIEW_POSTED = "review_posted",
  REVIEW_REMINDER = "review_reminder",
  CERT_EXPIRY_WARNING = "cert_expiry_warning",

  // Community
  FOLLOW_NEW = "follow_new",
  REPORT_RESOLVED = "report_resolved",

  // Payments
  PAYMENT_RECEIVED = "payment_received",
}

export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
}

// ─── Resource types (for navigation) ─────────────────────

export type NotificationResourceType =
  | "event"
  | "review"
  | "profile"
  | "certification"
  | "report"
  | "payment";

// ─── Domain models ───────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  resourceType: NotificationResourceType | null;
  resourceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  updatedAt: string;
}

// ─── API request / response types ────────────────────────

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MarkAsReadResponse {
  read: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[];
}

export interface UpdatePreferenceRequest {
  notificationType: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface UpdatePreferenceResponse {
  preference: NotificationPreference;
}

// ─── Notification category groupings ─────────────────────

export const NOTIFICATION_CATEGORIES = {
  events: [
    NotificationType.EVENT_RSVP,
    NotificationType.WAITLIST_PROMOTION,
    NotificationType.EVENT_CANCELLATION,
    NotificationType.OCCURRENCE_CANCELLATION,
  ],
  teachers: [
    NotificationType.REVIEW_POSTED,
    NotificationType.REVIEW_REMINDER,
    NotificationType.CERT_EXPIRY_WARNING,
  ],
  community: [
    NotificationType.FOLLOW_NEW,
    NotificationType.REPORT_RESOLVED,
  ],
  payments: [
    NotificationType.PAYMENT_RECEIVED,
  ],
} as const;
