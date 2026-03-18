import { db } from "@/lib/db/client";
import type { ReportEntry, ReportReason, ReportStatus } from "@acroyoga/shared/types/community";

export async function submitReport(
  reporterId: string,
  reportedUserId: string,
  reason: ReportReason,
  details?: string,
): Promise<{ reportId: string; status: ReportStatus }> {
  if (reporterId === reportedUserId) {
    throw new Error("Cannot report yourself");
  }

  // Rate limit: max 10 reports per 24h per reporter
  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM reports
     WHERE reporter_id = $1 AND created_at > now() - interval '24 hours'`,
    [reporterId],
  );
  if (parseInt(countResult.rows[0].cnt, 10) >= 10) {
    throw new Error("Report rate limit exceeded (10/24h)");
  }

  const result = await db().query<{ id: string; status: string }>(
    `INSERT INTO reports (reporter_id, reported_user_id, reason, details)
     VALUES ($1, $2, $3, $4)
     RETURNING id, status`,
    [reporterId, reportedUserId, reason, details ?? null],
  );

  return {
    reportId: result.rows[0].id,
    status: result.rows[0].status as ReportStatus,
  };
}

export async function getReportQueue(
  status?: ReportStatus,
  page = 1,
  pageSize = 20,
): Promise<{ reports: ReportEntry[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM reports ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].cnt, 10);

  const offset = (page - 1) * pageSize;
  const result = await db().query<{
    id: string;
    reporter_id: string;
    reported_user_id: string;
    reason: string;
    details: string | null;
    status: string;
    reviewed_by: string | null;
    created_at: string;
    reviewed_at: string | null;
  }>(
    `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, offset],
  );

  return {
    reports: result.rows.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reportedUserId: r.reported_user_id,
      reason: r.reason as ReportReason,
      details: r.details,
      status: r.status as ReportStatus,
      reviewedBy: r.reviewed_by,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
    })),
    total,
  };
}

export async function reviewReport(
  reportId: string,
  reviewerId: string,
  status: "reviewed" | "actioned" | "dismissed",
): Promise<ReportEntry | null> {
  const exists = await db().query(
    `SELECT 1 FROM reports WHERE id = $1`,
    [reportId],
  );
  if (exists.rows.length === 0) return null;

  const result = await db().query<{
    id: string;
    reporter_id: string;
    reported_user_id: string;
    reason: string;
    details: string | null;
    status: string;
    reviewed_by: string | null;
    created_at: string;
    reviewed_at: string | null;
  }>(
    `UPDATE reports
     SET status = $2, reviewed_by = $3, reviewed_at = now()
     WHERE id = $1
     RETURNING *`,
    [reportId, status, reviewerId],
  );

  const r = result.rows[0];
  return {
    id: r.id,
    reporterId: r.reporter_id,
    reportedUserId: r.reported_user_id,
    reason: r.reason as ReportReason,
    details: r.details,
    status: r.status as ReportStatus,
    reviewedBy: r.reviewed_by,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  };
}
