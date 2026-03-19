/**
 * API Contract: Permissions
 * Spec 004 — Permission grants CRUD and permission checking
 *
 * Base path: /api/permissions
 */

// ─── Enums & Shared Types ──────────────────────────────────────────

export type Role = 'global_admin' | 'country_admin' | 'city_admin' | 'event_creator';

export type ScopeType = 'global' | 'continent' | 'country' | 'city';

/** Member is the implicit role for all authenticated users — not stored as a grant */
export type EffectiveRole = Role | 'member' | 'visitor';

export interface Scope {
  scopeType: ScopeType;
  scopeValue: string | null; // null for global
}

export interface PermissionGrant {
  id: string;
  userId: string;
  role: Role;
  scopeType: ScopeType;
  scopeValue: string | null;
  grantedBy: string;
  grantedAt: string; // ISO 8601
  revokedAt: string | null;
  revokedBy: string | null;
}

// ─── POST /api/permissions/grants — Create a grant ──────────────────

export interface CreateGrantRequest {
  userId: string;
  role: Role;
  scopeType: ScopeType;
  scopeValue: string | null;
}

export interface CreateGrantResponse {
  grant: PermissionGrant;
}

/** Errors: 400 (invalid scope), 403 (caller lacks admin scope), 409 (duplicate active grant) */

// ─── GET /api/permissions/grants — List grants ──────────────────────

export interface ListGrantsQuery {
  userId?: string;        // filter by user
  scopeType?: ScopeType;  // filter by scope level
  scopeValue?: string;    // filter by scope value
  includeRevoked?: boolean; // default false
}

export interface ListGrantsResponse {
  grants: PermissionGrant[];
  total: number;
}

// ─── DELETE /api/permissions/grants — Revoke a grant ────────────────

export interface RevokeGrantRequest {
  grantId: string;
}

export interface RevokeGrantResponse {
  grant: PermissionGrant; // with revokedAt set
}

/** Errors: 403, 404, 409 (last global admin — cannot revoke) */

// ─── POST /api/permissions/check — Check permission ─────────────────

export type PermissionAction =
  | 'createEvent'
  | 'editEvent'
  | 'deleteEvent'
  | 'createVenue'
  | 'editVenue'
  | 'manageGrants'
  | 'approveRequests'
  | 'viewAdminPanel'
  | 'rsvp'
  | 'post'
  | 'follow';

export interface CheckPermissionRequest {
  action: PermissionAction;
  targetScope: Scope;
  resourceOwnerId?: string; // for edit checks — owner can always edit their own
}

export interface CheckPermissionResponse {
  allowed: boolean;
  matchedGrant: PermissionGrant | null; // the grant that satisfied the check (null if denied)
  effectiveRole: EffectiveRole;
}

/** Always returns 200 — `allowed: false` is not a 403 on the check endpoint itself.
 *  The 403 is returned by the protected mutation endpoint that calls this check internally. */
