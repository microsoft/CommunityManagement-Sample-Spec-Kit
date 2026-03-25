/**
 * Auth UI i18n message strings
 * Spec: 011-entra-external-id (T013)
 *
 * Constitution VIII: All user-facing strings are extracted here.
 * No raw string literals in LoginButtons.tsx or LinkedAccountsList.tsx.
 */

export const AUTH_MESSAGES = {
  // Login page
  loginPageTitle: "Welcome to AcroYoga Community",
  loginPageSubtitle: "Sign in to connect with the acro community.",

  // Social provider buttons
  signInWithGoogle: "Sign in with Google",
  signInWithFacebook: "Sign in with Facebook",
  signInWithApple: "Sign in with Apple",

  // Loading / error states
  signInLoading: "Signing in…",
  signInError: "Sign-in failed. Please try again.",
  signInErrorSessionExpired: "Your session expired. Please sign in again.",
  signInErrorOAuthCallback: "Authentication error. Please try a different provider.",
  signInErrorDefault: "An unexpected error occurred. Please try again.",

  // Linked accounts list
  linkedAccountsTitle: "Linked Accounts",
  linkedAccountsEmpty: "No additional accounts linked.",
  linkedAccountsRemove: "Remove",
  linkedAccountsAdd: "Link another account",
  linkedAccountsLastIdentityTooltip:
    "You cannot remove your last sign-in method. Link another account first.",
  linkedAccountsLinkedAt: "Linked",
  linkedAccountsRemoving: "Removing…",

  // Access control
  authRequired: "You must be signed in to view this page.",
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
