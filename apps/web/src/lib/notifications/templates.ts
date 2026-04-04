// Notification message templates — Spec 015
//
// i18n-ready template functions for each notification type.
// Returns title + body + resource link for rendering in UI and email.

import { NotificationType } from "@acroyoga/shared/types/notifications";
import type { NotificationResourceType } from "@acroyoga/shared/types/notifications";

export interface NotificationTemplate {
  title: string;
  body: string;
  resourceType?: string;
}

const NOTIFICATION_MESSAGES = {
  [NotificationType.EVENT_RSVP]: {
    title: "New RSVP",
    body: "Someone has RSVPed to your event.",
  },
  [NotificationType.WAITLIST_PROMOTION]: {
    title: "You're in!",
    body: "A spot opened up and you've been promoted from the waitlist.",
  },
  [NotificationType.EVENT_CANCELLATION]: {
    title: "Event cancelled",
    body: "An event you RSVPed to has been cancelled.",
  },
  [NotificationType.OCCURRENCE_CANCELLATION]: {
    title: "Occurrence cancelled",
    body: "A specific date of a recurring event you RSVPed to has been cancelled.",
  },
  [NotificationType.REVIEW_POSTED]: {
    title: "New review",
    body: "Someone has posted a review of your teaching.",
  },
  [NotificationType.REVIEW_REMINDER]: {
    title: "Review reminder",
    body: "You attended an event recently — consider leaving a review for the teacher.",
  },
  [NotificationType.CERT_EXPIRY_WARNING]: {
    title: "Certification expiring soon",
    body: "One of your certifications will expire within 30 days.",
  },
  [NotificationType.FOLLOW_NEW]: {
    title: "New follower",
    body: "Someone started following you.",
  },
  [NotificationType.REPORT_RESOLVED]: {
    title: "Report resolved",
    body: "A report you submitted has been reviewed and resolved.",
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    title: "Payment received",
    body: "You have received a payment for one of your events.",
  },
} as const;

/**
 * Get the template for a notification type.
 * Returns i18n-ready title and body text.
 */
export function getNotificationTemplate(
  type: NotificationType,
): NotificationTemplate {
  const tmpl = NOTIFICATION_MESSAGES[type];
  if (!tmpl) {
    return { title: "Notification", body: "You have a new notification." };
  }
  return { ...tmpl };
}

/**
 * Get the resource type hint for a notification type (for navigation).
 */
export function getResourceTypeForNotification(
  type: NotificationType,
): NotificationResourceType | undefined {
  switch (type) {
    case NotificationType.EVENT_RSVP:
    case NotificationType.WAITLIST_PROMOTION:
    case NotificationType.EVENT_CANCELLATION:
    case NotificationType.OCCURRENCE_CANCELLATION:
    case NotificationType.REVIEW_REMINDER:
      return "event";
    case NotificationType.REVIEW_POSTED:
      return "review";
    case NotificationType.CERT_EXPIRY_WARNING:
      return "certification";
    case NotificationType.FOLLOW_NEW:
      return "profile";
    case NotificationType.REPORT_RESOLVED:
      return "report";
    case NotificationType.PAYMENT_RECEIVED:
      return "payment";
    default:
      return undefined;
  }
}
