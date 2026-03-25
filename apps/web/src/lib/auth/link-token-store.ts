/**
 * Link Token Store — server-side CSRF token management for account linking
 * Spec: 011-entra-external-id (T025)
 *
 * Tokens are stored in-process with expiry (10 minutes).
 * In production with multiple replicas, this should be replaced with a Redis
 * or database-backed store. For single-instance deployments, in-process
 * storage is sufficient and avoids external dependencies.
 *
 * Constitution VII: Simplest viable solution — no new dependencies.
 */

import { randomUUID } from "crypto";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StoredToken {
  token: string;
  expiresAt: number;
}

// Map: userId → stored link token
const tokenStore = new Map<string, StoredToken>();

/**
 * Generate and store a new link token for the given user.
 * Replaces any existing token (one active token per user at a time).
 */
export function generateLinkToken(userId: string): {
  linkToken: string;
  expiresAt: string;
} {
  const token = randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokenStore.set(userId, { token, expiresAt });
  return { linkToken: token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Retrieve the stored token for a user if it exists and has not expired.
 * Returns null if no token exists or if it has expired.
 */
export async function getLinkToken(userId: string): Promise<string | null> {
  const stored = tokenStore.get(userId);
  if (!stored) return null;
  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(userId);
    return null;
  }
  return stored.token;
}

/**
 * Consume (delete) the stored token for a user after use.
 * Tokens are single-use to prevent replay attacks.
 */
export async function consumeLinkToken(userId: string): Promise<void> {
  tokenStore.delete(userId);
}
