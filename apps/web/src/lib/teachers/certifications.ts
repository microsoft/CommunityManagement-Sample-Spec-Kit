import { db } from "@/lib/db/client";
import type {
  Certification,
  CreateCertificationRequest,
  UpdateCertificationRequest,
} from "@acroyoga/shared/types/teachers";

export async function listCertifications(teacherProfileId: string): Promise<Certification[]> {
  const result = await db().query<Certification>(
    `SELECT id, teacher_profile_id, name, issuing_body, expiry_date, proof_document_url,
            status, verified_by_admin_id, verified_at, created_at, updated_at
     FROM certifications WHERE teacher_profile_id = $1
     ORDER BY created_at`,
    [teacherProfileId],
  );
  return result.rows;
}

export async function getCertification(certId: string): Promise<Certification | null> {
  const result = await db().query<Certification>(
    `SELECT id, teacher_profile_id, name, issuing_body, expiry_date, proof_document_url,
            status, verified_by_admin_id, verified_at, created_at, updated_at
     FROM certifications WHERE id = $1`,
    [certId],
  );
  return result.rows[0] ?? null;
}

export async function createCertification(
  teacherProfileId: string,
  data: CreateCertificationRequest,
): Promise<Certification> {
  const result = await db().query<Certification>(
    `INSERT INTO certifications (teacher_profile_id, name, issuing_body, expiry_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id, teacher_profile_id, name, issuing_body, expiry_date, proof_document_url,
               status, verified_by_admin_id, verified_at, created_at, updated_at`,
    [teacherProfileId, data.name, data.issuingBody, data.expiryDate ?? null],
  );
  return result.rows[0];
}

export async function updateCertification(
  certId: string,
  data: UpdateCertificationRequest,
): Promise<Certification | null> {
  const fields: string[] = [];
  const values: unknown[] = [certId];
  let idx = 2;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.issuingBody !== undefined) { fields.push(`issuing_body = $${idx++}`); values.push(data.issuingBody); }
  if (data.expiryDate !== undefined) { fields.push(`expiry_date = $${idx++}`); values.push(data.expiryDate); }
  if (fields.length === 0) return getCertification(certId);

  fields.push("updated_at = now()");

  const result = await db().query<Certification>(
    `UPDATE certifications SET ${fields.join(", ")} WHERE id = $1
     RETURNING id, teacher_profile_id, name, issuing_body, expiry_date, proof_document_url,
               status, verified_by_admin_id, verified_at, created_at, updated_at`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deleteCertification(certId: string): Promise<boolean> {
  const existing = await db().query(`SELECT id FROM certifications WHERE id = $1`, [certId]);
  if (existing.rows.length === 0) return false;

  await db().query(`DELETE FROM certifications WHERE id = $1`, [certId]);
  return true;
}

export async function verifyCertification(
  certId: string,
  adminId: string,
  decision: "verified" | "revoked",
): Promise<Certification | null> {
  const existing = await getCertification(certId);
  if (!existing) return null;

  const result = await db().query<Certification>(
    `UPDATE certifications SET status = $2, verified_by_admin_id = $3, verified_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING id, teacher_profile_id, name, issuing_body, expiry_date, proof_document_url,
               status, verified_by_admin_id, verified_at, created_at, updated_at`,
    [certId, decision, adminId],
  );

  // Update teacher badge_status if needed
  await updateBadgeStatus(existing.teacher_profile_id);

  return result.rows[0] ?? null;
}

export async function updateBadgeStatus(teacherProfileId: string): Promise<void> {
  // Badge is "verified" if at least one cert is verified and none are expired
  const certs = await db().query<{ status: string }>(
    `SELECT status FROM certifications WHERE teacher_profile_id = $1`,
    [teacherProfileId],
  );

  const statuses = certs.rows.map((r) => r.status);
  let badge: string;

  if (statuses.includes("verified") && !statuses.includes("expired")) {
    badge = "verified";
  } else if (statuses.includes("expired")) {
    badge = "expired";
  } else if (statuses.every((s) => s === "revoked")) {
    badge = "revoked";
  } else {
    badge = "pending";
  }

  await db().query(
    `UPDATE teacher_profiles SET badge_status = $2, updated_at = now() WHERE id = $1`,
    [teacherProfileId, badge],
  );
}

export async function confirmProofUpload(
  certId: string,
  proofUrl: string,
): Promise<Certification | null> {
  const result = await db().query<Certification>(
    `UPDATE certifications SET proof_document_url = $2, updated_at = now()
     WHERE id = $1
     RETURNING id, teacher_profile_id, name, issuing_body, expiry_date, proof_document_url,
               status, verified_by_admin_id, verified_at, created_at, updated_at`,
    [certId, proofUrl],
  );
  return result.rows[0] ?? null;
}

/**
 * Expire certifications past their expiry date. Called by daily job.
 */
export async function expireOverdueCertifications(): Promise<number> {
  // Find certs to expire first (PGlite rowCount unreliable)
  const toExpire = await db().query<{ id: string; teacher_profile_id: string }>(
    `SELECT id, teacher_profile_id FROM certifications
     WHERE status = 'verified' AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE`,
  );

  if (toExpire.rows.length === 0) return 0;

  await db().query(
    `UPDATE certifications SET status = 'expired', updated_at = now()
     WHERE status = 'verified' AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE`,
  );

  // Update badge status for affected teachers
  const profileIds = [...new Set(toExpire.rows.map((r) => r.teacher_profile_id))];
  for (const pid of profileIds) {
    await updateBadgeStatus(pid);
  }

  return toExpire.rows.length;
}

/**
 * List certifications expiring within N days. For admin dashboard.
 */
export async function listExpiringCertifications(
  days: number,
): Promise<(Certification & { user_name: string })[]> {
  const result = await db().query<Certification & { user_name: string }>(
    `SELECT c.id, c.teacher_profile_id, c.name, c.issuing_body, c.expiry_date,
            c.proof_document_url, c.status, c.verified_by_admin_id, c.verified_at,
            c.created_at, c.updated_at, u.name as user_name
     FROM certifications c
     JOIN teacher_profiles tp ON tp.id = c.teacher_profile_id
     JOIN users u ON u.id = tp.user_id
     WHERE c.status = 'verified'
       AND c.expiry_date IS NOT NULL
       AND c.expiry_date <= CURRENT_DATE + $1 * interval '1 day'
       AND c.expiry_date >= CURRENT_DATE
     ORDER BY c.expiry_date`,
    [days],
  );
  return result.rows;
}
