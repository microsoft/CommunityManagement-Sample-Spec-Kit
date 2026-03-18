import { db } from "@/lib/db/client";

/**
 * Export all user data for GDPR compliance.
 * Returns all permission grants, requests, and payment accounts for the user.
 */
export async function exportUserData(userId: string) {
  const [grants, requests, payments, auditLogs] = await Promise.all([
    db().query(
      "SELECT id, role, scope_type, scope_value, granted_by, granted_at, revoked_at, revoked_by FROM permission_grants WHERE user_id = $1",
      [userId],
    ),
    db().query(
      "SELECT id, requested_role, scope_type, scope_value, message, status, reviewed_by, reviewed_at, review_reason, created_at FROM permission_requests WHERE user_id = $1",
      [userId],
    ),
    db().query(
      "SELECT id, stripe_account_id, onboarding_complete, connected_at, disconnected_at FROM creator_payment_accounts WHERE user_id = $1",
      [userId],
    ),
    db().query(
      "SELECT id, action, role, scope_type, scope_value, performed_by, metadata, created_at FROM permission_audit_log WHERE user_id = $1 ORDER BY created_at",
      [userId],
    ),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    userId,
    permissionGrants: grants.rows,
    permissionRequests: requests.rows,
    paymentAccounts: payments.rows,
    auditLog: auditLogs.rows,
  };
}
