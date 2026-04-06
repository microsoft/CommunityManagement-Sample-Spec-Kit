/**
 * All user-facing strings for mobile app screens.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 *
 * Pattern matches web convention: per-domain *-messages.ts with `as const`
 * objects. When i18n is integrated (next-intl or react-intl), replace
 * string values with translation keys (e.g., t("home.title")).
 */

// ─── Home Screen ──────────────────────────────────────────
export const HOME_MESSAGES = {
  title: "Upcoming Events",
  empty: "No upcoming events",
  emptySubtext: "Check back later for new events in your area.",
  error: "Failed to load events",
  retry: "Tap to retry",
} as const;

// ─── Events List Screen ──────────────────────────────────
export const EVENTS_LIST_MESSAGES = {
  search: "Search events...",
  empty: "No events found",
  emptyFiltered: "No events match your filters",
  error: "Failed to load events",
  retry: "Tap to retry",
  allCategories: "All",
} as const;

// ─── Event Detail Screen ─────────────────────────────────
export const EVENT_DETAIL_MESSAGES = {
  loading: "Loading event...",
  error: "Failed to load event",
  retry: "Tap to retry",
  rsvp: "RSVP",
  rsvpFull: "Join Waitlist",
  rsvpSuccess: "You're in!",
  rsvpWaitlisted: "Added to waitlist",
  rsvpError: "RSVP failed",
  selectRole: "Select your role",
  cancel: "Cancel",
  confirm: "Confirm",
  spots: "spots left",
  full: "Event Full",
  attendees: "attendees",
  about: "About",
  when: "When",
  where: "Where",
} as const;

// ─── Teachers List Screen ────────────────────────────────
export const TEACHERS_LIST_MESSAGES = {
  search: "Search teachers...",
  empty: "No teachers found",
  error: "Failed to load teachers",
  retry: "Tap to retry",
  certified: "Certified",
} as const;

// ─── Teacher Detail Screen ───────────────────────────────
export const TEACHER_DETAIL_MESSAGES = {
  loading: "Loading teacher...",
  error: "Failed to load teacher",
  retry: "Tap to retry",
  certifications: "Certifications",
  about: "About",
  reviews: "Reviews",
  noReviews: "No reviews yet",
  noBio: "No bio available",
} as const;

// ─── Bookings Screen ─────────────────────────────────────
export const BOOKINGS_MESSAGES = {
  upcoming: "Upcoming",
  past: "Past",
  empty: "No bookings yet",
  emptySubtext: "RSVP to events to see your bookings here.",
  error: "Failed to load bookings",
  retry: "Tap to retry",
  cancelled: "Cancelled",
  waitlisted: "Waitlisted",
  confirmed: "Confirmed",
} as const;

// ─── Profile Screen ──────────────────────────────────────
export const PROFILE_MESSAGES = {
  loading: "Loading profile...",
  error: "Failed to load profile",
  retry: "Tap to retry",
  editProfile: "Edit Profile",
  notificationSettings: "Notification Settings",
  signOut: "Sign Out",
  signOutConfirm: "Are you sure you want to sign out?",
  cancel: "Cancel",
  member: "Member",
} as const;

// ─── Notification Settings Screen ────────────────────────
export const NOTIFICATION_SETTINGS_MESSAGES = {
  title: "Notification Settings",
  loading: "Loading preferences...",
  error: "Failed to load preferences",
  retry: "Tap to retry",
  saved: "Preferences saved",
  pushNotifications: "Push Notifications",
  pushDescription: "Receive push notifications on your device",
  categories: "Notification Categories",
  eventReminders: "Event Reminders",
  eventRemindersDesc: "Get reminded before events you've RSVP'd to",
  rsvpUpdates: "RSVP Updates",
  rsvpUpdatesDesc: "New RSVPs to your events",
  waitlistUpdates: "Waitlist Updates",
  waitlistUpdatesDesc: "When you're promoted from the waitlist",
  eventChanges: "Event Changes",
  eventChangesDesc: "Cancellations and schedule changes",
} as const;

// ─── Not Found Screen ────────────────────────────────────
export const NOT_FOUND_MESSAGES = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist.",
  goHome: "Go to Home",
} as const;

// ─── Login Screen ────────────────────────────────────────
export const LOGIN_MESSAGES = {
  title: "AcroYoga Community",
  subtitle: "Sign in to continue",
  emailLabel: "Email",
  emailPlaceholder: "your@email.com",
  passwordLabel: "Password",
  passwordPlaceholder: "Enter your password",
  signIn: "Sign In",
  signingIn: "Signing in...",
  error: "Sign in failed. Please check your credentials.",
} as const;
