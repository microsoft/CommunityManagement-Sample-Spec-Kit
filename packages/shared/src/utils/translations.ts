/**
 * Translation keys for UI strings.
 * Centralizes all user-facing text for i18n extraction.
 */
export const translations = {
  roles: {
    global_admin: "Global Admin",
    country_admin: "Country Admin",
    city_admin: "City Admin",
    event_creator: "Event Creator",
    member: "Member",
    visitor: "Visitor",
  },
  scopes: {
    global: "Global",
    continent: "Continent",
    country: "Country",
    city: "City",
  },
  permissions: {
    grantSuccess: "Permission granted successfully.",
    revokeSuccess: "Permission revoked.",
    revokeConfirm: "Revoke this permission grant?",
    lastAdminError: "Cannot revoke the last global admin.",
    noGrants: "No active permission grants.",
  },
  requests: {
    submitSuccess: "Request submitted. An admin will review it shortly.",
    approveSuccess: "Request approved. Permission has been granted.",
    rejectSuccess: "Request rejected.",
    duplicateError: "You already have a pending request for this city.",
    invalidCityError: "The selected city is not available.",
    noPending: "No pending requests.",
    rejectReasonPrompt: "Reason for rejection:",
  },
  payments: {
    connectButton: "Connect with Stripe",
    connecting: "Redirecting…",
    connected: "Connected",
    onboardingComplete: "Complete",
    onboardingInProgress: "In Progress",
    notConnected: "Connect your Stripe account to receive payments for your events.",
  },
  common: {
    loading: "Loading…",
    error: "An error occurred. Please try again.",
    networkError: "Network error. Check your connection.",
    actions: "Actions",
    approve: "Approve",
    reject: "Reject",
    revoke: "Revoke",
  },
} as const;

export type TranslationKey = keyof typeof translations;
