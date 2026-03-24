/**
 * Auth Types — Entra External ID Social Login
 * Spec: 011-entra-external-id
 *
 * Shared TypeScript types for authentication, social provider identities,
 * and account linking. These types extend the existing AuthSession without
 * breaking existing callers.
 */

// ── Social Provider ────────────────────────────────────────────────────────

/**
 * Supported social identity providers, federated through Entra External ID.
 * Adding a new provider requires:
 *   1. Portal configuration in the Entra External ID tenant
 *   2. A new value in this union type
 *   3. A new sign-in button in LoginButtons.tsx
 */
export type SocialProvider = "google" | "facebook" | "apple";

// ── Auth Session (unchanged shape — backward-compatible) ───────────────────

/**
 * The session object returned by getServerSession().
 *
 * Shape is UNCHANGED from the existing implementation (Spec 004).
 * The userId is always the platform UUID from users.id — never an Entra oid
 * or social provider sub directly.
 */
export interface AuthSession {
  /** Platform user ID — UUID from users.id. Stable across all social logins. */
  userId: string;
}

// ── User Profile from Social Sign-In ──────────────────────────────────────

/**
 * Normalised social user profile extracted from the Entra External ID
 * ID token after authentication. Passed to upsertSocialUser().
 */
export interface SocialUserProfile {
  /** Entra External ID Object ID — stable cross-session identifier. */
  providerOid: string;
  /** The social provider used for this sign-in. */
  provider: SocialProvider | string;
  /** Email address from the social provider. May be null for Apple relay users. */
  email: string | null;
  /** Display name from the social provider. May be null if not provided. */
  displayName: string | null;
  /** Profile photo URL from the social provider. May be null. */
  avatarUrl: string | null;
}

// ── User Record (social auth fields) ──────────────────────────────────────

/**
 * The fields added to the users table by migration 011-001.
 * Combined with the existing user fields (id, created_at, etc.).
 */
export interface UserSocialFields {
  /** Primary social provider used at first sign-in. */
  provider: SocialProvider | string | null;
  /** Entra External ID oid for the primary identity. */
  providerOid: string | null;
  /** Profile photo URL. Refreshed on each sign-in. */
  avatarUrl: string | null;
}

// ── Linked Account ─────────────────────────────────────────────────────────

/**
 * A social provider identity linked to a platform user account.
 * Stored in the linked_accounts table.
 */
export interface LinkedAccount {
  id: string;
  userId: string;
  provider: SocialProvider | string;
  providerOid: string;
  linkedAt: string; // ISO 8601 datetime
}

/**
 * API response shape for listing a user's linked accounts.
 * Used by GET /api/profile/linked-accounts (future spec) or profile settings page.
 */
export interface ListLinkedAccountsResponse {
  linkedAccounts: LinkedAccount[];
}

// ── Account Linking API ────────────────────────────────────────────────────

/**
 * Request body for POST /api/auth/link
 *
 * Sent after the user completes the secondary social authentication flow.
 * The server validates the linkToken against the session to prevent CSRF.
 */
export interface LinkAccountRequest {
  /**
   * Short-lived CSRF token issued by the server when the user initiates
   * account linking. Stored server-side in the user's session.
   */
  linkToken: string;
  /**
   * The Entra External ID oid from the secondary sign-in.
   * Validated server-side from the NextAuth token — NOT trusted from client.
   */
  providerOid: string;
  /** The social provider of the secondary identity being linked. */
  provider: SocialProvider | string;
}

/**
 * Success response for POST /api/auth/link
 */
export interface LinkAccountResponse {
  linked: true;
  account: LinkedAccount;
}

// ── Login Page Props ───────────────────────────────────────────────────────

/**
 * Configuration for the login page, resolved server-side.
 * Passed to the LoginButtons client component.
 */
export interface LoginPageConfig {
  /**
   * Whether Entra External ID is configured in the current environment.
   * When false, the mock user switcher (Spec 007) is displayed instead.
   */
  entraConfigured: boolean;
  /**
   * The URL to redirect to after successful sign-in.
   * Validated server-side to prevent open redirects (must be same-origin).
   */
  callbackUrl: string;
}

// ── Provider Display Metadata ──────────────────────────────────────────────

/**
 * Display metadata for a social provider button on the login page.
 * Used by LoginButtons.tsx to render provider-specific UI.
 */
export interface ProviderButtonConfig {
  provider: SocialProvider;
  /** i18n key for the button label, e.g., "auth.signInWithGoogle" */
  labelKey: string;
  /** Accessible icon name or SVG path identifier */
  iconName: string;
}

/**
 * The social providers available on the login page.
 * Add new providers here when they are configured in Entra External ID.
 */
export const SOCIAL_PROVIDERS: ProviderButtonConfig[] = [
  {
    provider: "google",
    labelKey: "auth.signInWithGoogle",
    iconName: "google",
  },
  {
    provider: "facebook",
    labelKey: "auth.signInWithFacebook",
    iconName: "facebook",
  },
  {
    provider: "apple",
    labelKey: "auth.signInWithApple",
    iconName: "apple",
  },
];
