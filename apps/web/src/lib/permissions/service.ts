import { db } from "@/lib/db/client";
import type {
  CheckPermissionRequest,
  CheckPermissionResponse,
  PermissionGrant,
  PermissionAction,
  Role,
  Scope,
  ScopeType,
  EffectiveRole,
} from "@acroyoga/shared/types/permissions";
import { getUserGrants, invalidateUserCache } from "./cache";
import { doesScopeEncompass } from "./hierarchy";
import { roleHasCapability } from "./types";
import { logAuditEvent } from "./audit";

interface GrantRow {
  id: string;
  user_id: string;
  role: Role;
  scope_type: ScopeType;
  scope_value: string | null;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

function rowToGrant(row: GrantRow): PermissionGrant {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    scopeType: row.scope_type,
    scopeValue: row.scope_value,
    grantedBy: row.granted_by,
    grantedAt: new Date(row.granted_at).toISOString(),
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    revokedBy: row.revoked_by,
  };
}

/**
 * Check if a user has permission to perform an action at a target scope.
 * Uses most-permissive-wins semantics (R-3).
 */
export async function checkPermission(
  userId: string | null,
  request: CheckPermissionRequest,
): Promise<CheckPermissionResponse> {
  if (!userId) {
    return { allowed: false, matchedGrant: null, effectiveRole: "visitor" };
  }

  const grants = await getUserGrants(userId);

  if (grants.length === 0) {
    // Authenticated but no grants = member
    return { allowed: false, matchedGrant: null, effectiveRole: "member" };
  }

  // Check each grant — most permissive wins
  for (const grant of grants) {
    if (!roleHasCapability(grant.role, request.action)) continue;

    const grantScope: Scope = { scopeType: grant.scopeType, scopeValue: grant.scopeValue };
    const covers = await doesScopeEncompass(grantScope, request.targetScope);
    if (covers) {
      return { allowed: true, matchedGrant: grant, effectiveRole: grant.role };
    }
  }

  // For editEvent — owner can always edit their own content
  if (
    request.resourceOwnerId &&
    request.resourceOwnerId === userId &&
    (request.action === "editEvent" || request.action === "editVenue")
  ) {
    // Find any grant with scope coverage, regardless of capability
    for (const grant of grants) {
      const grantScope: Scope = { scopeType: grant.scopeType, scopeValue: grant.scopeValue };
      const covers = await doesScopeEncompass(grantScope, request.targetScope);
      if (covers) {
        return { allowed: true, matchedGrant: grant, effectiveRole: grant.role };
      }
    }
  }

  // Determine effective role from highest-level grant
  const highestRole = grants.reduce<EffectiveRole>((best, g) => {
    const order: Record<string, number> = {
      global_admin: 4,
      country_admin: 3,
      city_admin: 2,
      event_creator: 1,
      member: 0,
    };
    return (order[g.role] ?? 0) > (order[best] ?? 0) ? g.role : best;
  }, "member");

  return { allowed: false, matchedGrant: null, effectiveRole: highestRole };
}

/**
 * Grant a permission to a user.
 */
export async function grantPermission(
  userId: string,
  role: Role,
  scopeType: ScopeType,
  scopeValue: string | null,
  grantedBy: string,
): Promise<PermissionGrant> {
  const result = await db().query<GrantRow>(
    `INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, role, scopeType, scopeValue, grantedBy],
  );

  const grant = rowToGrant(result.rows[0]);

  await logAuditEvent({
    action: "grant",
    userId,
    role,
    scopeType,
    scopeValue,
    performedBy: grantedBy,
  });

  invalidateUserCache(userId);
  return grant;
}

/**
 * Revoke a permission grant.
 * Returns 409-style error if this is the last global admin (R-7).
 */
export async function revokePermission(
  grantId: string,
  revokedBy: string,
): Promise<{ grant: PermissionGrant; error?: string }> {
  // Fetch the grant
  const grantResult = await db().query<GrantRow>(
    "SELECT * FROM permission_grants WHERE id = $1",
    [grantId],
  );
  if (grantResult.rows.length === 0) {
    return { grant: null as unknown as PermissionGrant, error: "not_found" };
  }

  const existing = grantResult.rows[0];
  if (existing.revoked_at) {
    return { grant: rowToGrant(existing), error: "already_revoked" };
  }

  // R-7: Protect last global admin — lock rows then count
  if (existing.role === "global_admin" && existing.scope_type === "global") {
    const lockResult = await db().query<{ id: string }>(
      `SELECT id FROM permission_grants
       WHERE role = 'global_admin' AND scope_type = 'global' AND revoked_at IS NULL
       FOR UPDATE`,
    );
    if (lockResult.rows.length <= 1) {
      return { grant: rowToGrant(existing), error: "last_global_admin" };
    }
  }

  const result = await db().query<GrantRow>(
    `UPDATE permission_grants SET revoked_at = now(), revoked_by = $1
     WHERE id = $2 RETURNING *`,
    [revokedBy, grantId],
  );

  const grant = rowToGrant(result.rows[0]);

  await logAuditEvent({
    action: "revoke",
    userId: existing.user_id,
    role: existing.role,
    scopeType: existing.scope_type,
    scopeValue: existing.scope_value,
    performedBy: revokedBy,
  });

  invalidateUserCache(existing.user_id);
  return { grant };
}

/**
 * List grants, optionally filtered, scoped to what the caller can see.
 */
export async function listGrants(filters: {
  userId?: string;
  scopeType?: ScopeType;
  scopeValue?: string;
  includeRevoked?: boolean;
}): Promise<PermissionGrant[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.userId) {
    conditions.push(`user_id = $${paramIdx++}`);
    params.push(filters.userId);
  }
  if (filters.scopeType) {
    conditions.push(`scope_type = $${paramIdx++}`);
    params.push(filters.scopeType);
  }
  if (filters.scopeValue) {
    conditions.push(`scope_value = $${paramIdx++}`);
    params.push(filters.scopeValue);
  }
  if (!filters.includeRevoked) {
    conditions.push("revoked_at IS NULL");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await db().query<GrantRow>(
    `SELECT * FROM permission_grants ${where} ORDER BY granted_at DESC`,
    params,
  );

  return result.rows.map(rowToGrant);
}

/**
 * List grants filtered to what a caller's scope covers (for admin panel).
 */
export async function listGrantsForScope(
  callerGrants: PermissionGrant[],
  filters: {
    userId?: string;
    scopeType?: ScopeType;
    scopeValue?: string;
    includeRevoked?: boolean;
  },
): Promise<PermissionGrant[]> {
  const allGrants = await listGrants(filters);

  // Filter to only grants the caller's scope encompasses
  const visible: PermissionGrant[] = [];
  for (const grant of allGrants) {
    const targetScope: Scope = { scopeType: grant.scopeType, scopeValue: grant.scopeValue };
    for (const callerGrant of callerGrants) {
      const callerScope: Scope = {
        scopeType: callerGrant.scopeType,
        scopeValue: callerGrant.scopeValue,
      };
      if (await doesScopeEncompass(callerScope, targetScope)) {
        visible.push(grant);
        break;
      }
    }
  }

  return visible;
}
