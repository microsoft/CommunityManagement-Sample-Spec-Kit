/**
 * Social User Service — Entra External ID
 * Spec: 011-entra-external-id
 *
 * Provides user provisioning (upsert) and OID-based lookup for social login.
 * Called from the NextAuth signIn and jwt callbacks.
 */

import { db } from "@/lib/db/client";
import type { SocialUserProfile } from "@acroyoga/shared/types/auth";

/**
 * Apple display name fallback: when Apple omits the name after first consent,
 * derive a reasonable default from email prefix or use "Apple User".
 */
function resolveDisplayName(profile: SocialUserProfile): string {
  if (profile.displayName && profile.displayName.trim().length > 0) {
    return profile.displayName.trim();
  }
  if (profile.email) {
    // Use email prefix as fallback (e.g. "alice" from "alice@example.com")
    return profile.email.split("@")[0];
  }
  return "Apple User";
}

/**
 * Upsert a social user into the users table.
 *
 * - On first sign-in: creates a new user row and returns the new UUID.
 * - On subsequent sign-ins with the same oid: updates email, display_name,
 *   and avatar_url, and returns the existing UUID.
 *
 * Idempotent: safe to call on every sign-in.
 *
 * @param profile  Normalised social user profile from the Entra External ID token.
 * @returns        Platform userId (users.id UUID).
 */
export async function upsertSocialUser(
  profile: SocialUserProfile,
): Promise<string> {
  const displayName = resolveDisplayName(profile);

  const result = await db().query<{ id: string }>(
    `INSERT INTO users (provider_oid, email, name, avatar_url, provider, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     ON CONFLICT (provider_oid)
     DO UPDATE SET
       email       = EXCLUDED.email,
       name        = EXCLUDED.name,
       avatar_url  = EXCLUDED.avatar_url,
       updated_at  = now()
     RETURNING id`,
    [
      profile.providerOid,
      profile.email ?? null,
      displayName,
      profile.avatarUrl ?? null,
      profile.provider,
    ],
  );

  return result.rows[0].id;
}

/**
 * Look up the platform userId for a given Entra External ID oid.
 *
 * Checks two locations (in priority order):
 *   1. users.provider_oid — primary identity
 *   2. linked_accounts.provider_oid — additional linked identities
 *
 * @param oid  Entra External ID Object ID from the token.
 * @returns    Platform userId (users.id UUID) or null if not found.
 */
export async function getUserIdByOid(oid: string): Promise<string | null> {
  const result = await db().query<{ id: string }>(
    `SELECT u.id
     FROM users u
     WHERE u.provider_oid = $1

     UNION ALL

     SELECT la.user_id AS id
     FROM linked_accounts la
     WHERE la.provider_oid = $1

     LIMIT 1`,
    [oid],
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0].id;
}
