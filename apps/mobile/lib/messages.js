"use strict";
/**
 * All user-facing strings for mobile app screens.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 *
 * Pattern matches web convention: per-domain *-messages.ts with `as const`
 * objects. When i18n is integrated (next-intl or react-intl), replace
 * string values with translation keys (e.g., t("home.title")).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGIN_MESSAGES = exports.NOT_FOUND_MESSAGES = exports.NOTIFICATION_SETTINGS_MESSAGES = exports.PROFILE_MESSAGES = exports.BOOKINGS_MESSAGES = exports.TEACHER_DETAIL_MESSAGES = exports.TEACHERS_LIST_MESSAGES = exports.EVENT_DETAIL_MESSAGES = exports.EVENTS_LIST_MESSAGES = exports.HOME_MESSAGES = void 0;
// ─── Home Screen ──────────────────────────────────────────
exports.HOME_MESSAGES = {
    title: "Upcoming Events",
    empty: "No upcoming events",
    emptySubtext: "Check back later for new events in your area.",
    error: "Failed to load events",
    retry: "Tap to retry",
};
// ─── Events List Screen ──────────────────────────────────
exports.EVENTS_LIST_MESSAGES = {
    search: "Search events...",
    empty: "No events found",
    emptyFiltered: "No events match your filters",
    error: "Failed to load events",
    retry: "Tap to retry",
    allCategories: "All",
};
// ─── Event Detail Screen ─────────────────────────────────
exports.EVENT_DETAIL_MESSAGES = {
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
};
// ─── Teachers List Screen ────────────────────────────────
exports.TEACHERS_LIST_MESSAGES = {
    search: "Search teachers...",
    empty: "No teachers found",
    error: "Failed to load teachers",
    retry: "Tap to retry",
    certified: "Certified",
};
// ─── Teacher Detail Screen ───────────────────────────────
exports.TEACHER_DETAIL_MESSAGES = {
    loading: "Loading teacher...",
    error: "Failed to load teacher",
    retry: "Tap to retry",
    certifications: "Certifications",
    about: "About",
    reviews: "Reviews",
    noReviews: "No reviews yet",
    noBio: "No bio available",
};
// ─── Bookings Screen ─────────────────────────────────────
exports.BOOKINGS_MESSAGES = {
    upcoming: "Upcoming",
    past: "Past",
    empty: "No bookings yet",
    emptySubtext: "RSVP to events to see your bookings here.",
    error: "Failed to load bookings",
    retry: "Tap to retry",
    cancelled: "Cancelled",
    waitlisted: "Waitlisted",
    confirmed: "Confirmed",
};
// ─── Profile Screen ──────────────────────────────────────
exports.PROFILE_MESSAGES = {
    loading: "Loading profile...",
    error: "Failed to load profile",
    retry: "Tap to retry",
    editProfile: "Edit Profile",
    notificationSettings: "Notification Settings",
    signOut: "Sign Out",
    signOutConfirm: "Are you sure you want to sign out?",
    cancel: "Cancel",
    member: "Member",
};
// ─── Notification Settings Screen ────────────────────────
exports.NOTIFICATION_SETTINGS_MESSAGES = {
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
};
// ─── Not Found Screen ────────────────────────────────────
exports.NOT_FOUND_MESSAGES = {
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist.",
    goHome: "Go to Home",
};
// ─── Login Screen ────────────────────────────────────────
exports.LOGIN_MESSAGES = {
    title: "AcroYoga Community",
    subtitle: "Sign in to continue",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    signIn: "Sign In",
    signingIn: "Signing in...",
    error: "Sign in failed. Please check your credentials.",
};
