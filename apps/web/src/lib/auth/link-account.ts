/**
 * Account Linking Service
 * Spec: 011-entra-external-id (T024)
 *
 * Core logic for linking/unlinking social provider identities to a platform user.
 * Called from API route handlers and tests.
 *
 * Separated from the route handler so it can be unit-tested without Next.js HTTP.
 */

import { db } from "@/lib/db/client";

// ── Error codes ─────────────────────────────────────────────────────────────

export class LinkAccountError extends Error {
  public readonly detail: string;
  constructor(
    public readonly code:
      | "AUTH_REQUIRED"
      | "LINK_CONFLICT"
      | "INVALID_LINK_TOKEN"
      | "UNLINK_LAST_IDENTITY",
    detail: string,
  ) {
    super(code); // message === code, so toThrow("CODE") works in tests
    this.name = "LinkAccountError";
    this.detail = detail;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface LinkAccountParams {
  /** Authenticated user ID, or null if unauthenticated */
  userId: string | null;
  /** Entra External ID oid of the account to link */
  providerOid: string;
  /** Social provider name */
  provider: string;
  /** CSRF token from the linking flow */
  linkToken: string;
  /** Server-validated: true if the token matched the session-stored token */
  validToken: boolean;
}

export interface LinkAccountResult {
  linked: true;
  account: {
    id: string;
    provider: string;
    linkedAt: string;
  };
}

export interface UnlinkAccountParams {
  /** Authenticated user ID */
  userId: string;
  /** ID of the linked_accounts row to remove */
  linkedAccountId: string;
}

// ── Link Account ─────────────────────────────────────────────────────────────

/**
 * Link a secondary social provider identity to a platform user account.
 *
 * Guards:
 * - Throws AUTH_REQUIRED if userId is null.
 * - Throws INVALID_LINK_TOKEN if validToken is false.
 * - Throws LINK_CONFLICT if providerOid is already linked to a different userId.
 * - Idempotent: linking the same oid to the same userId is a no-op (200 success).
 */
export async function linkAccount(
  params: LinkAccountParams,
): Promise<LinkAccountResult> {
  const { userId, providerOid, provider, validToken } = params;

  // Guard: must be authenticated
  if (!userId) {
    throw new LinkAccountError(
      "AUTH_REQUIRED",
      "Authentication required to link an account.",
    );
  }

  // Guard: token must be valid
  if (!validToken) {
    throw new LinkAccountError(
      "INVALID_LINK_TOKEN",
      "Link token is invalid or has expired. Please try again.",
    );
  }

  // Check for conflict: is this oid already linked to a different user?
  const conflictCheck = await db().query<{ user_id: string }>(
    `SELECT user_id FROM linked_accounts WHERE provider_oid = $1`,
    [providerOid],
  );

  if (conflictCheck.rows.length > 0) {
    const existingUserId = conflictCheck.rows[0].user_id;
    if (existingUserId !== userId) {
      throw new LinkAccountError(
        "LINK_CONFLICT",
        "This social account is already linked to a different platform profile.",
      );
    }
    // Same user → already linked (idempotent)
    const existing = await db().query<{
      id: string;
      provider: string;
      linked_at: string;
    }>(
      `SELECT id, provider, linked_at FROM linked_accounts WHERE provider_oid = $1 AND user_id = $2`,
      [providerOid, userId],
    );
    return {
      linked: true,
      account: {
        id: existing.rows[0].id,
        provider: existing.rows[0].provider,
        linkedAt: existing.rows[0].linked_at,
      },
    };
  }

  // Insert the linked account
  const result = await db().query<{
    id: string;
    provider: string;
    linked_at: string;
  }>(
    `INSERT INTO linked_accounts (user_id, provider, provider_oid)
     VALUES ($1, $2, $3)
     RETURNING id, provider, linked_at`,
    [userId, provider, providerOid],
  );

  return {
    linked: true,
    account: {
      id: result.rows[0].id,
      provider: result.rows[0].provider,
      linkedAt: result.rows[0].linked_at,
    },
  };
}

// ── Unlink Account ────────────────────────────────────────────────────────────

/**
 * Unlink a secondary social provider identity from a platform user account.
 *
 * Guards:
 * - Throws AUTH_REQUIRED if the linked account does not belong to the user.
 * - Throws UNLINK_LAST_IDENTITY if removing this account would leave the user
 *   with no sign-in method.
 */
export async function unlinkAccount(
  params: UnlinkAccountParams,
): Promise<{ unlinked: true }> {
  const { userId, linkedAccountId } = params;

  // Verify ownership
  const owned = await db().query<{ id: string }>(
    `SELECT id FROM linked_accounts WHERE id = $1 AND user_id = $2`,
    [linkedAccountId, userId],
  );
  if (owned.rows.length === 0) {
    throw new LinkAccountError(
      "AUTH_REQUIRED",
      "You do not have permission to remove this linked account.",
    );
  }

  // Count remaining identities: users.provider_oid + linked_accounts rows
  const identityCount = await db().query<{ cnt: number }>(
    `SELECT (
       CASE WHEN u.provider_oid IS NOT NULL THEN 1 ELSE 0 END
       + (SELECT COUNT(*)::int FROM linked_accounts la2 WHERE la2.user_id = $1)
     ) AS cnt
     FROM users u WHERE u.id = $1`,
    [userId],
  );

  const total = identityCount.rows[0]?.cnt ?? 0;
  if (total <= 1) {
    throw new LinkAccountError(
      "UNLINK_LAST_IDENTITY",
      "Cannot remove the last linked identity. You would be unable to sign in.",
    );
  }

  await db().query(`DELETE FROM linked_accounts WHERE id = $1`, [
    linkedAccountId,
  ]);

  return { unlinked: true };
}

// ── List Linked Accounts ──────────────────────────────────────────────────────

export interface LinkedAccountRow {
  id: string;
  userId: string;
  provider: string;
  providerOid: string;
  linkedAt: string;
}

export async function listLinkedAccounts(
  userId: string,
): Promise<LinkedAccountRow[]> {
  const result = await db().query<{
    id: string;
    user_id: string;
    provider: string;
    provider_oid: string;
    linked_at: string;
  }>(
    `SELECT id, user_id, provider, provider_oid, linked_at
     FROM linked_accounts
     WHERE user_id = $1
     ORDER BY linked_at ASC`,
    [userId],
  );

  return result.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    provider: r.provider,
    providerOid: r.provider_oid,
    linkedAt: r.linked_at,
  }));
}
