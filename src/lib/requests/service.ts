import { db } from "@/lib/db/client";
import { grantPermission } from "@/lib/permissions/service";
import { logAuditEvent } from "@/lib/permissions/audit";
import type { PermissionRequest } from "@/types/requests";

interface RequestRow {
  id: string;
  user_id: string;
  requested_role: "event_creator";
  scope_type: "city";
  scope_value: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
  created_at: string;
}

function rowToRequest(row: RequestRow): PermissionRequest {
  return {
    id: row.id,
    userId: row.user_id,
    requestedRole: row.requested_role,
    scopeType: row.scope_type,
    scopeValue: row.scope_value,
    message: row.message,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    reviewReason: row.review_reason,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * Submit a new Event Creator role request for a city.
 */
export async function submitRequest(
  userId: string,
  scopeValue: string,
  message?: string,
): Promise<{ request: PermissionRequest; error?: string }> {
  // Validate city exists in geography
  const cityCheck = await db().query(
    "SELECT id FROM geography WHERE city = $1",
    [scopeValue],
  );
  if (cityCheck.rows.length === 0) {
    return { request: null as unknown as PermissionRequest, error: "invalid_city" };
  }

  try {
    const result = await db().query<RequestRow>(
      `INSERT INTO permission_requests (user_id, requested_role, scope_type, scope_value, message)
       VALUES ($1, 'event_creator', 'city', $2, $3)
       RETURNING *`,
      [userId, scopeValue, message ?? null],
    );

    const request = rowToRequest(result.rows[0]);

    await logAuditEvent({
      action: "request_submitted",
      userId,
      role: "event_creator",
      scopeType: "city",
      scopeValue,
    });

    return { request };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("idx_requests_pending")) {
      return { request: null as unknown as PermissionRequest, error: "duplicate_pending" };
    }
    throw err;
  }
}

/**
 * Review (approve/reject) a pending request.
 */
export async function reviewRequest(
  requestId: string,
  decision: "approved" | "rejected",
  reviewerId: string,
  reason?: string,
): Promise<{ request: PermissionRequest; grantId?: string; error?: string }> {
  // Fetch the request
  const existing = await db().query<RequestRow>(
    "SELECT * FROM permission_requests WHERE id = $1",
    [requestId],
  );
  if (existing.rows.length === 0) {
    return { request: null as unknown as PermissionRequest, error: "not_found" };
  }

  const req = existing.rows[0];
  if (req.status !== "pending") {
    return { request: rowToRequest(req), error: "already_reviewed" };
  }

  const result = await db().query<RequestRow>(
    `UPDATE permission_requests
     SET status = $1, reviewed_by = $2, reviewed_at = now(), review_reason = $3
     WHERE id = $4 RETURNING *`,
    [decision, reviewerId, reason ?? null, requestId],
  );

  const updated = rowToRequest(result.rows[0]);
  let grantId: string | undefined;

  if (decision === "approved") {
    const grant = await grantPermission(
      req.user_id,
      "event_creator",
      "city",
      req.scope_value,
      reviewerId,
    );
    grantId = grant.id;

    await logAuditEvent({
      action: "request_approved",
      userId: req.user_id,
      role: "event_creator",
      scopeType: "city",
      scopeValue: req.scope_value,
      performedBy: reviewerId,
    });
  } else {
    await logAuditEvent({
      action: "request_rejected",
      userId: req.user_id,
      role: "event_creator",
      scopeType: "city",
      scopeValue: req.scope_value,
      performedBy: reviewerId,
      metadata: { reason },
    });
  }

  return { request: updated, grantId };
}

/**
 * List requests with filters.
 */
export async function listRequests(filters: {
  status?: string;
  scopeValue?: string;
  userId?: string;
}): Promise<PermissionRequest[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.scopeValue) {
    conditions.push(`scope_value = $${idx++}`);
    params.push(filters.scopeValue);
  }
  if (filters.userId) {
    conditions.push(`user_id = $${idx++}`);
    params.push(filters.userId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await db().query<RequestRow>(
    `SELECT * FROM permission_requests ${where} ORDER BY created_at DESC`,
    params,
  );

  return result.rows.map(rowToRequest);
}
