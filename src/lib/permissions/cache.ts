import { db } from "@/lib/db/client";
import type { PermissionGrant, Role, ScopeType } from "@/types/permissions";

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

/** Session-level in-memory cache keyed by userId */
const cache = new Map<string, PermissionGrant[]>();

export async function getUserGrants(userId: string): Promise<PermissionGrant[]> {
  const cached = cache.get(userId);
  if (cached) return cached;

  const result = await db().query<GrantRow>(
    "SELECT * FROM permission_grants WHERE user_id = $1 AND revoked_at IS NULL",
    [userId],
  );
  const grants = result.rows.map(rowToGrant);
  cache.set(userId, grants);
  return grants;
}

export function invalidateUserCache(userId: string): void {
  cache.delete(userId);
}

export function clearCache(): void {
  cache.clear();
}
