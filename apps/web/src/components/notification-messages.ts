/**
 * All user-facing strings for notification UI components.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 *
 * Covers:
 * - NotificationBell.tsx
 * - NotificationPreferences.tsx
 * - notifications/page.tsx (NotificationsPage)
 */

export const NOTIFICATION_MESSAGES = {
  // ─── NotificationBell ────────────────────────────────────
  bellTitle: "Notifications",
  bellNoNotifications: "No notifications yet",
  bellMarkAsRead: "Mark as read",
  bellViewAll: "View all notifications",
  bellUnreadCount: (count: number) =>
    `${count} unread notification${count === 1 ? "" : "s"}`,

  // ─── NotificationsPage ───────────────────────────────────
  pageTitle: "Notifications",
  pageNoNotifications: "No notifications yet",
  pageMarkAllAsRead: "Mark all as read",
  pageShowUnread: "Unread",
  pageShowAll: "All",
  pageLoadMore: "Load more",

  // ─── NotificationPreferences ─────────────────────────────
  prefsTitle: "Notification Preferences",
  prefsDescription: "Choose how you want to be notified about different activities.",
  prefsInApp: "In-App",
  prefsEmail: "Email",
  prefsSaving: "Saving…",
  prefsCatEvents: "Events",
  prefsCatTeachers: "Teachers & Reviews",
  prefsCatCommunity: "Community",
  prefsCatPayments: "Payments",

  // Notification type labels (for preferences toggle grid)
  typeEventRsvp: "Someone RSVPs to your event",
  typeWaitlistPromotion: "You're promoted from a waitlist",
  typeEventCancellation: "An event you RSVPed to is cancelled",
  typeOccurrenceCancellation: "A recurring event occurrence is cancelled",
  typeReviewPosted: "Someone reviews your teaching",
  typeReviewReminder: "Reminder to review a past event",
  typeCertExpiryWarning: "Your certification is expiring",
  typeFollowNew: "Someone follows you",
  typeReportResolved: "Your report is resolved",
  typePaymentReceived: "You receive a payment",
} as const;

export type NotificationMessageKey = keyof typeof NOTIFICATION_MESSAGES;
