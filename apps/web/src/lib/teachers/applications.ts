import { db } from "@/lib/db/client";
import type {
  TeacherRequest,
  SubmitTeacherApplicationRequest,
  CredentialEntry,
} from "@acroyoga/shared/types/teachers";

export async function submitApplication(
  userId: string,
  data: SubmitTeacherApplicationRequest,
): Promise<TeacherRequest> {
  // Check for existing pending request
  const existing = await db().query(
    `SELECT id FROM teacher_requests WHERE user_id = $1 AND status = 'pending'`,
    [userId],
  );
  if (existing.rows.length > 0) {
    throw new Error("User already has a pending teacher application");
  }

  // Check if already a verified teacher
  const profile = await db().query(
    `SELECT id FROM teacher_profiles WHERE user_id = $1 AND is_deleted = false`,
    [userId],
  );
  if (profile.rows.length > 0) {
    throw new Error("User already has a teacher profile");
  }

  const result = await db().query<TeacherRequest>(
    `INSERT INTO teacher_requests (user_id, bio, specialties, credentials)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, bio, specialties, credentials, status, reviewed_by, reviewed_at, rejection_reason, created_at`,
    [userId, data.bio ?? null, data.specialties, JSON.stringify(data.credentials)],
  );

  return result.rows[0];
}

export async function listPendingRequests(
  page = 1,
  limit = 20,
): Promise<{ requests: TeacherRequest[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM teacher_requests WHERE status = 'pending'`,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db().query<TeacherRequest>(
    `SELECT id, user_id, bio, specialties, credentials, status, reviewed_by, reviewed_at, rejection_reason, created_at
     FROM teacher_requests
     WHERE status = 'pending'
     ORDER BY created_at
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return { requests: result.rows, total };
}

export async function getRequest(requestId: string): Promise<TeacherRequest | null> {
  const result = await db().query<TeacherRequest>(
    `SELECT id, user_id, bio, specialties, credentials, status, reviewed_by, reviewed_at, rejection_reason, created_at
     FROM teacher_requests WHERE id = $1`,
    [requestId],
  );
  return result.rows[0] ?? null;
}

export async function approveRequest(
  requestId: string,
  adminId: string,
): Promise<TeacherRequest | null> {
  const request = await getRequest(requestId);
  if (!request) return null;
  if (request.status !== "pending") {
    throw new Error(`Cannot approve request with status: ${request.status}`);
  }

  // Create teacher profile
  const profileResult = await db().query<{ id: string }>(
    `INSERT INTO teacher_profiles (user_id, bio, specialties, badge_status)
     VALUES ($1, $2, $3, 'verified')
     RETURNING id`,
    [request.user_id, request.bio, request.specialties],
  );
  const profileId = profileResult.rows[0].id;

  // Create certifications from credentials
  const credentials: CredentialEntry[] = typeof request.credentials === "string"
    ? JSON.parse(request.credentials as unknown as string)
    : request.credentials;

  for (const cred of credentials) {
    await db().query(
      `INSERT INTO certifications (teacher_profile_id, name, issuing_body, expiry_date, proof_document_url, status, verified_by_admin_id, verified_at)
       VALUES ($1, $2, $3, $4, $5, 'verified', $6, now())`,
      [profileId, cred.name, cred.issuingBody, cred.expiryDate ?? null, cred.proofDocumentUrl ?? null, adminId],
    );
  }

  // Update request status
  const result = await db().query<TeacherRequest>(
    `UPDATE teacher_requests SET status = 'approved', reviewed_by = $2, reviewed_at = now()
     WHERE id = $1
     RETURNING id, user_id, bio, specialties, credentials, status, reviewed_by, reviewed_at, rejection_reason, created_at`,
    [requestId, adminId],
  );

  return result.rows[0] ?? null;
}

export async function rejectRequest(
  requestId: string,
  adminId: string,
  reason?: string,
): Promise<TeacherRequest | null> {
  const request = await getRequest(requestId);
  if (!request) return null;
  if (request.status !== "pending") {
    throw new Error(`Cannot reject request with status: ${request.status}`);
  }

  const result = await db().query<TeacherRequest>(
    `UPDATE teacher_requests SET status = 'rejected', reviewed_by = $2, reviewed_at = now(), rejection_reason = $3
     WHERE id = $1
     RETURNING id, user_id, bio, specialties, credentials, status, reviewed_by, reviewed_at, rejection_reason, created_at`,
    [requestId, adminId, reason ?? null],
  );

  return result.rows[0] ?? null;
}
