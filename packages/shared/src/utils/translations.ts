/**
 * Translation keys for UI strings.
 * Centralizes all user-facing text for i18n extraction.
 *
 * NOTE (Spec 014): This module is maintained for backward compatibility.
 * New code should use `next-intl` hooks (`useTranslations`) and reference
 * keys from the JSON translation files in `apps/web/messages/`.
 * The i18n key equivalents are documented inline.
 */
export const translations = {
  /** i18n: permissions.roles.* */
  roles: {
    global_admin: "Global Admin",
    country_admin: "Country Admin",
    city_admin: "City Admin",
    event_creator: "Event Creator",
    member: "Member",
    visitor: "Visitor",
  },
  /** i18n: permissions.scopes.* */
  scopes: {
    global: "Global",
    continent: "Continent",
    country: "Country",
    city: "City",
  },
  /** i18n: permissions.* */
  permissions: {
    grantSuccess: "Permission granted successfully.",
    revokeSuccess: "Permission revoked.",
    revokeConfirm: "Revoke this permission grant?",
    lastAdminError: "Cannot revoke the last global admin.",
    noGrants: "No active permission grants.",
  },
  /** i18n: permissions.requests.* */
  requests: {
    submitSuccess: "Request submitted. An admin will review it shortly.",
    approveSuccess: "Request approved. Permission has been granted.",
    rejectSuccess: "Request rejected.",
    duplicateError: "You already have a pending request for this city.",
    invalidCityError: "The selected city is not available.",
    noPending: "No pending requests.",
    rejectReasonPrompt: "Reason for rejection:",
  },
  /** i18n: payments.* */
  payments: {
    connectButton: "Connect with Stripe",
    connecting: "Redirecting…",
    connected: "Connected",
    onboardingComplete: "Complete",
    onboardingInProgress: "In Progress",
    notConnected: "Connect your Stripe account to receive payments for your events.",
  },
  /** i18n: common.* */
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
