/**
 * All user-facing strings for notification templates and email unsubscribe pages.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in templates.
 *
 * Covers:
 * - lib/notifications/templates.ts (notification title/body per type)
 * - app/api/unsubscribe/route.ts (confirmation/error HTML pages)
 */

export const TEMPLATE_MESSAGES = {
  // ─── Notification type templates ─────────────────────────
  eventRsvpTitle: "New RSVP",
  eventRsvpBody: "Someone has RSVPed to your event.",
  waitlistPromotionTitle: "You're in!",
  waitlistPromotionBody:
    "A spot opened up and you've been promoted from the waitlist.",
  eventCancellationTitle: "Event cancelled",
  eventCancellationBody: "An event you RSVPed to has been cancelled.",
  occurrenceCancellationTitle: "Occurrence cancelled",
  occurrenceCancellationBody:
    "A specific date of a recurring event you RSVPed to has been cancelled.",
  reviewPostedTitle: "New review",
  reviewPostedBody: "Someone has posted a review of your teaching.",
  reviewReminderTitle: "Review reminder",
  reviewReminderBody:
    "You attended an event recently — consider leaving a review for the teacher.",
  certExpiryWarningTitle: "Certification expiring soon",
  certExpiryWarningBody:
    "One of your certifications will expire within 30 days.",
  followNewTitle: "New follower",
  followNewBody: "Someone started following you.",
  reportResolvedTitle: "Report resolved",
  reportResolvedBody:
    "A report you submitted has been reviewed and resolved.",
  paymentReceivedTitle: "Payment received",
  paymentReceivedBody:
    "You have received a payment for one of your events.",

  // Fallback for unknown notification types
  defaultTitle: "Notification",
  defaultBody: "You have a new notification.",

  // ─── Unsubscribe pages ───────────────────────────────────
  unsubscribeConfirmTitle: "Unsubscribed",
  unsubscribeConfirmBody:
    "You have been unsubscribed from these email notifications.",
  unsubscribeConfirmSettings:
    "You can manage all notification preferences in your",
  unsubscribeSettingsLink: "settings",
  unsubscribeErrorTitle: "Invalid Link",
  unsubscribeErrorBody:
    "This unsubscribe link is invalid or has expired.",
  unsubscribeErrorSettings: "You can manage your notifications in your",
} as const;

export type TemplateMessageKey = keyof typeof TEMPLATE_MESSAGES;
