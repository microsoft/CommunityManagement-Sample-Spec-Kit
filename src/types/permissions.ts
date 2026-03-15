// Shared Permission Types — per contracts/permissions-api.ts

export type Role = "global_admin" | "country_admin" | "city_admin" | "event_creator";

export type ScopeType = "global" | "continent" | "country" | "city";

export type EffectiveRole = Role | "member" | "visitor";

export interface Scope {
  scopeType: ScopeType;
  scopeValue: string | null;
}

export interface PermissionGrant {
  id: string;
  userId: string;
  role: Role;
  scopeType: ScopeType;
  scopeValue: string | null;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
}

export type PermissionAction =
  | "createEvent"
  | "editEvent"
  | "deleteEvent"
  | "createVenue"
  | "editVenue"
  | "manageGrants"
  | "approveRequests"
  | "viewAdminPanel"
  | "rsvp"
  | "post"
  | "follow";

export interface CheckPermissionRequest {
  action: PermissionAction;
  targetScope: Scope;
  resourceOwnerId?: string;
}

export interface CheckPermissionResponse {
  allowed: boolean;
  matchedGrant: PermissionGrant | null;
  effectiveRole: EffectiveRole;
}

export interface CreateGrantRequest {
  userId: string;
  role: Role;
  scopeType: ScopeType;
  scopeValue: string | null;
}

export interface CreateGrantResponse {
  grant: PermissionGrant;
}

export interface ListGrantsQuery {
  userId?: string;
  scopeType?: ScopeType;
  scopeValue?: string;
  includeRevoked?: boolean;
}

export interface ListGrantsResponse {
  grants: PermissionGrant[];
  total: number;
}

export interface RevokeGrantRequest {
  grantId: string;
}

export interface RevokeGrantResponse {
  grant: PermissionGrant;
}
