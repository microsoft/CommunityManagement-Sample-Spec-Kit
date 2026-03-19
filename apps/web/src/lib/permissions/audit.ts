import { db } from "@/lib/db/client";

export type AuditAction =
  | "grant"
  | "revoke"
  | "check_denied"
  | "request_submitted"
  | "request_approved"
  | "request_rejected";

export interface AuditEntry {
  action: AuditAction;
  userId: string;
  role?: string | null;
  scopeType?: string | null;
  scopeValue?: string | null;
  performedBy?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  await db().query(
    `INSERT INTO permission_audit_log (user_id, action, role, scope_type, scope_value, performed_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.userId,
      entry.action,
      entry.role ?? null,
      entry.scopeType ?? null,
      entry.scopeValue ?? null,
      entry.performedBy ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ],
  );
}
