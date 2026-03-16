import { db } from "@/lib/db/client";
import type {
  ConcessionStatus,
  ConcessionApplicationRequest,
  ReviewConcessionRequest,
  ConcessionStatusValue,
} from "@/types/recurring";

export async function applyConcession(
  userId: string,
  data: ConcessionApplicationRequest,
): Promise<ConcessionStatus> {
  // Check for existing pending/approved concession
  const existing = await db().query<ConcessionStatus>(
    `SELECT id, status FROM concession_statuses
     WHERE user_id = $1 AND status IN ('pending', 'approved')`,
    [userId],
  );

  if (existing.rows.length > 0) {
    const current = existing.rows[0];
    if (current.status === "approved") {
      throw new Error("User already has an approved concession");
    }
    if (current.status === "pending") {
      throw new Error("User already has a pending concession application");
    }
  }

  const result = await db().query<ConcessionStatus>(
    `INSERT INTO concession_statuses (user_id, status, evidence)
     VALUES ($1, 'pending', $2)
     RETURNING id, user_id, status, evidence, approved_by, approved_at,
               rejected_by, rejected_at, revoked_by, revoked_at, created_at`,
    [userId, data.evidence],
  );

  return result.rows[0];
}

export async function getConcessionStatus(
  userId: string,
): Promise<ConcessionStatus | null> {
  const result = await db().query<ConcessionStatus>(
    `SELECT id, user_id, status, evidence, approved_by, approved_at,
            rejected_by, rejected_at, revoked_by, revoked_at, created_at
     FROM concession_statuses
     WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function listPendingConcessions(): Promise<ConcessionStatus[]> {
  const result = await db().query<ConcessionStatus>(
    `SELECT id, user_id, status, evidence, approved_by, approved_at,
            rejected_by, rejected_at, revoked_by, revoked_at, created_at
     FROM concession_statuses
     WHERE status = 'pending'
     ORDER BY created_at`,
  );
  return result.rows;
}

export async function reviewConcession(
  concessionId: string,
  reviewerId: string,
  data: ReviewConcessionRequest,
): Promise<ConcessionStatus | null> {
  // Verify it's pending
  const existing = await db().query<ConcessionStatus>(
    `SELECT id, status FROM concession_statuses WHERE id = $1`,
    [concessionId],
  );
  if (existing.rows.length === 0) return null;
  if (existing.rows[0].status !== "pending") {
    throw new Error(`Cannot review concession with status: ${existing.rows[0].status}`);
  }

  const decision = data.action;

  if (decision === "approve") {
    const result = await db().query<ConcessionStatus>(
      `UPDATE concession_statuses
       SET status = 'approved', approved_by = $2, approved_at = now()
       WHERE id = $1
       RETURNING id, user_id, status, evidence, approved_by, approved_at,
                 rejected_by, rejected_at, revoked_by, revoked_at, created_at`,
      [concessionId, reviewerId],
    );
    return result.rows[0] ?? null;
  } else {
    const result = await db().query<ConcessionStatus>(
      `UPDATE concession_statuses
       SET status = 'rejected', rejected_by = $2, rejected_at = now()
       WHERE id = $1
       RETURNING id, user_id, status, evidence, approved_by, approved_at,
                 rejected_by, rejected_at, revoked_by, revoked_at, created_at`,
      [concessionId, reviewerId],
    );
    return result.rows[0] ?? null;
  }
}

export async function revokeConcession(
  userId: string,
  revokedBy: string,
): Promise<ConcessionStatus | null> {
  const existing = await db().query<ConcessionStatus>(
    `SELECT id FROM concession_statuses
     WHERE user_id = $1 AND status = 'approved'`,
    [userId],
  );
  if (existing.rows.length === 0) return null;

  const result = await db().query<ConcessionStatus>(
    `UPDATE concession_statuses
     SET status = 'revoked', revoked_by = $2, revoked_at = now()
     WHERE id = $1
     RETURNING id, user_id, status, evidence, approved_by, approved_at,
               rejected_by, rejected_at, revoked_by, revoked_at, created_at`,
    [existing.rows[0].id, revokedBy],
  );
  return result.rows[0] ?? null;
}
