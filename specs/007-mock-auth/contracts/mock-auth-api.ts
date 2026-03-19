// Contract: Mock Auth API — Dev-only endpoints for user switching
// Spec: 007-mock-auth
// These endpoints are ONLY active when NODE_ENV === 'development'

// ─── Sample User Definition ──────────────────────────────────────

import type { Role, ScopeType } from "@/types/permissions";

export interface SampleUser {
  /** Stable deterministic UUID */
  id: string;
  /** URL-safe identifier for query param switching */
  slug: string;
  name: string;
  email: string;
  /** Role for display purposes (derived from grants) */
  displayRole: string;
  /** Permission grants to seed for this user */
  grants: SampleGrant[];
}

export interface SampleGrant {
  role: Role;
  scopeType: ScopeType;
  scopeValue: string | null;
}

/** Special slug for the anonymous/visitor pseudo-user */
export const ANONYMOUS_SLUG = "anonymous";

// ─── POST /api/dev/mock-user ─────────────────────────────────────
// Sets the active mock user via cookie

export interface SetMockUserRequest {
  /** Sample user slug, or "anonymous" to clear the session */
  slug: string;
}

export interface SetMockUserResponse {
  /** The active user after switching, or null for anonymous */
  activeUser: {
    id: string;
    slug: string;
    name: string;
    displayRole: string;
  } | null;
}

// ─── GET /api/dev/mock-user ──────────────────────────────────────
// Returns the currently active mock user and list of available users

export interface GetMockUserResponse {
  /** Currently active mock user, null if anonymous */
  activeUser: {
    id: string;
    slug: string;
    name: string;
    displayRole: string;
  } | null;
  /** All available sample users including the anonymous option */
  availableUsers: Array<{
    id: string | null;
    slug: string;
    name: string;
    displayRole: string;
  }>;
}

// ─── GET /api/dev/mock-user/seed ─────────────────────────────────
// Triggers sample user seeding (idempotent)

export interface SeedMockUsersResponse {
  /** Number of users seeded/upserted */
  usersSeeded: number;
  /** Number of grants seeded/upserted */
  grantsSeeded: number;
}

// ─── Error responses follow standard @/lib/errors envelope ───────
// 404: Returned in production mode (endpoint does not exist)
// 400: Invalid slug provided
