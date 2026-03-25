/**
 * Account Linking API Contract — POST /api/auth/link
 * Spec: 011-entra-external-id
 *
 * This file documents the request/response contract for the account-linking
 * endpoint. The actual implementation lives in:
 *   apps/web/src/app/api/auth/link/route.ts
 */

// ── Endpoint Definition ────────────────────────────────────────────────────

/**
 * POST /api/auth/link
 *
 * Links a secondary social provider identity to the authenticated user's
 * platform account. After linking, signing in with the secondary social
 * provider returns the same userId as the primary identity.
 *
 * Authentication: Required (requireAuth). Returns 401 if unauthenticated.
 *
 * Authorization: The authenticated user can only link accounts to their
 * own userId. No admin override needed — this is a self-service operation.
 *
 * Idempotency: Linking the same provider_oid that is already linked to the
 * same userId returns 200 (no-op) rather than 409.
 *
 * CSRF Protection: The linkToken must be a valid server-issued token from
 * the authenticated user's session. Tokens expire after 10 minutes.
 */

// ── Request ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/link
 * Content-Type: application/json
 *
 * Body validated with Zod before processing.
 */
export interface LinkAccountRequestBody {
  /**
   * Short-lived CSRF token. The server generates this when the user clicks
   * "Link account" and stores it in the session. The client sends it back
   * here to prevent CSRF attacks on the linking flow.
   *
   * Validation: UUID format, matches server-stored token, not expired.
   */
  linkToken: string;
  /**
   * The Entra External ID Object ID of the secondary identity being linked.
   * Extracted server-side from the NextAuth secondary sign-in token.
   *
   * Note: Although sent in the request body, this value is VERIFIED
   * server-side by cross-checking against the NextAuth pending-link
   * session stored during the secondary authentication callback.
   * It is NOT blindly trusted from the client.
   */
  providerOid: string;
  /** The social provider of the secondary identity. */
  provider: "google" | "facebook" | "apple";
}

// ── Responses ─────────────────────────────────────────────────────────────

/**
 * 200 OK — Account linked successfully (or was already linked to same user).
 */
export interface LinkAccountSuccessResponse {
  linked: true;
  account: {
    id: string;
    provider: string;
    linkedAt: string; // ISO 8601 datetime
  };
}

/**
 * 401 Unauthorized — User is not authenticated.
 * Standard error envelope per Constitution Principle I.
 */
export interface LinkAccountUnauthorizedResponse {
  error: "Unauthorized";
  code: "AUTH_REQUIRED";
}

/**
 * 409 Conflict — The provider_oid is already linked to a different userId.
 */
export interface LinkAccountConflictResponse {
  error: "This social account is already linked to a different platform profile.";
  code: "LINK_CONFLICT";
}

/**
 * 422 Unprocessable Entity — Invalid or expired linkToken.
 */
export interface LinkAccountInvalidTokenResponse {
  error: "Link token is invalid or has expired. Please try again.";
  code: "INVALID_LINK_TOKEN";
}

/**
 * 400 Bad Request — Request body validation failed.
 * Returned by the Zod validation middleware.
 */
export interface LinkAccountValidationErrorResponse {
  error: "Invalid request body";
  code: "VALIDATION_ERROR";
  details: unknown; // Zod error details
}

// ── Initiate Linking Flow ─────────────────────────────────────────────────

/**
 * GET /api/auth/link/init
 *
 * Issues a short-lived CSRF token for the account-linking flow.
 * Must be called while authenticated. The token is stored server-side
 * in the user's session and returned to the client for use in the
 * subsequent POST /api/auth/link call.
 *
 * Authentication: Required (requireAuth). Returns 401 if unauthenticated.
 */
export interface LinkInitResponse {
  /**
   * Short-lived token (10-minute expiry) for the account-linking flow.
   * Include in the POST /api/auth/link body as `linkToken`.
   */
  linkToken: string;
  /** ISO 8601 expiry timestamp */
  expiresAt: string;
}

// ── Unlink Account ────────────────────────────────────────────────────────

/**
 * DELETE /api/auth/link/:linkedAccountId
 *
 * Removes a linked social identity from the user's account.
 *
 * Authentication: Required (requireAuth).
 * Authorization: User can only unlink their own accounts (XI — Resource Ownership).
 *
 * Guard: A user must retain at least one social identity (either the primary
 * in users.provider_oid or at least one row in linked_accounts). If removing
 * the last identity would leave the user unable to sign in, return 409.
 */
export interface UnlinkAccountSuccessResponse {
  unlinked: true;
}

/**
 * 409 Conflict — Cannot remove the last linked identity.
 */
export interface UnlinkLastIdentityConflictResponse {
  error: "Cannot remove the last linked identity. You would be unable to sign in.";
  code: "UNLINK_LAST_IDENTITY";
}
