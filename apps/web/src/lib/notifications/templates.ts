// Notification message templates — Spec 015
//
// i18n-ready template functions for each notification type.
// Returns title + body + resource link for rendering in UI and email.
// Constitution VIII: All user-facing strings from template-messages.ts.

import { NotificationType } from "@acroyoga/shared/types/notifications";
import type { NotificationResourceType } from "@acroyoga/shared/types/notifications";
import { TEMPLATE_MESSAGES as tmsg } from "./template-messages";

export interface NotificationTemplate {
  title: string;
  body: string;
  resourceType?: string;
}

const NOTIFICATION_MESSAGES = {
  [NotificationType.EVENT_RSVP]: {
    title: tmsg.eventRsvpTitle,
    body: tmsg.eventRsvpBody,
  },
  [NotificationType.WAITLIST_PROMOTION]: {
    title: tmsg.waitlistPromotionTitle,
    body: tmsg.waitlistPromotionBody,
  },
  [NotificationType.EVENT_CANCELLATION]: {
    title: tmsg.eventCancellationTitle,
    body: tmsg.eventCancellationBody,
  },
  [NotificationType.OCCURRENCE_CANCELLATION]: {
    title: tmsg.occurrenceCancellationTitle,
    body: tmsg.occurrenceCancellationBody,
  },
  [NotificationType.REVIEW_POSTED]: {
    title: tmsg.reviewPostedTitle,
    body: tmsg.reviewPostedBody,
  },
  [NotificationType.REVIEW_REMINDER]: {
    title: tmsg.reviewReminderTitle,
    body: tmsg.reviewReminderBody,
  },
  [NotificationType.CERT_EXPIRY_WARNING]: {
    title: tmsg.certExpiryWarningTitle,
    body: tmsg.certExpiryWarningBody,
  },
  [NotificationType.FOLLOW_NEW]: {
    title: tmsg.followNewTitle,
    body: tmsg.followNewBody,
  },
  [NotificationType.REPORT_RESOLVED]: {
    title: tmsg.reportResolvedTitle,
    body: tmsg.reportResolvedBody,
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    title: tmsg.paymentReceivedTitle,
    body: tmsg.paymentReceivedBody,
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
    return { title: tmsg.defaultTitle, body: tmsg.defaultBody };
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
