import { db } from "@/lib/db/client";
import { escapeIlike } from "@/lib/db/utils";
import type {
  TeacherProfile,
  TeacherProfileDetail,
  UpdateTeacherProfileRequest,
  Certification,
  TeacherPhoto,
} from "@acroyoga/shared/types/teachers";

export async function getTeacherProfile(profileId: string): Promise<TeacherProfileDetail | null> {
  const result = await db().query<TeacherProfile & { user_name: string; user_email: string }>(
    `SELECT tp.id, tp.user_id, tp.bio, tp.specialties, tp.badge_status,
            tp.aggregate_rating, tp.review_count, tp.is_deleted, tp.deleted_at,
            tp.created_at, tp.updated_at,
            u.name as user_name, u.email as user_email
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.id = $1 AND tp.is_deleted = false`,
    [profileId],
  );
  if (result.rows.length === 0) return null;
  const profile = result.rows[0];

  const certs = await db().query<Certification>(
    `SELECT id, teacher_profile_id, name, issuing_body, expiry_date, proof_document_url,
            status, verified_by_admin_id, verified_at, created_at, updated_at
     FROM certifications WHERE teacher_profile_id = $1
     ORDER BY created_at`,
    [profileId],
  );

  const photos = await db().query<TeacherPhoto>(
    `SELECT id, teacher_profile_id, url, sort_order, created_at
     FROM teacher_photos WHERE teacher_profile_id = $1
     ORDER BY sort_order`,
    [profileId],
  );

  const now = new Date().toISOString();
  const upcoming = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM event_teachers et
     JOIN events e ON e.id = et.event_id
     WHERE et.teacher_profile_id = $1 AND e.start_datetime > $2`,
    [profileId, now],
  );
  const past = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM event_teachers et
     JOIN events e ON e.id = et.event_id
     WHERE et.teacher_profile_id = $1 AND e.start_datetime <= $2`,
    [profileId, now],
  );

  return {
    ...profile,
    certifications: certs.rows,
    photos: photos.rows,
    upcoming_event_count: parseInt(upcoming.rows[0].count, 10),
    past_event_count: parseInt(past.rows[0].count, 10),
  };
}

export async function getTeacherProfileByUserId(userId: string): Promise<TeacherProfile | null> {
  const result = await db().query<TeacherProfile>(
    `SELECT id, user_id, bio, specialties, badge_status, aggregate_rating, review_count,
            is_deleted, deleted_at, created_at, updated_at
     FROM teacher_profiles WHERE user_id = $1 AND is_deleted = false`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function updateTeacherProfile(
  profileId: string,
  data: UpdateTeacherProfileRequest,
): Promise<TeacherProfile | null> {
  const fields: string[] = [];
  const values: unknown[] = [profileId];
  let idx = 2;

  if (data.bio !== undefined) {
    fields.push(`bio = $${idx++}`);
    values.push(data.bio);
  }
  if (data.specialties !== undefined) {
    fields.push(`specialties = $${idx++}`);
    values.push(data.specialties);
  }
  if (fields.length === 0) return getTeacherProfileByProfileId(profileId);

  fields.push("updated_at = now()");

  const result = await db().query<TeacherProfile>(
    `UPDATE teacher_profiles SET ${fields.join(", ")}
     WHERE id = $1 AND is_deleted = false
     RETURNING id, user_id, bio, specialties, badge_status, aggregate_rating, review_count,
               is_deleted, deleted_at, created_at, updated_at`,
    values,
  );
  return result.rows[0] ?? null;
}

async function getTeacherProfileByProfileId(profileId: string): Promise<TeacherProfile | null> {
  const result = await db().query<TeacherProfile>(
    `SELECT id, user_id, bio, specialties, badge_status, aggregate_rating, review_count,
            is_deleted, deleted_at, created_at, updated_at
     FROM teacher_profiles WHERE id = $1 AND is_deleted = false`,
    [profileId],
  );
  return result.rows[0] ?? null;
}

export async function searchTeachers(options: {
  q?: string;
  specialty?: string;
  badge?: string;
  city?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{ teachers: TeacherProfile[]; total: number }> {
  const { q, specialty, badge, city, sort = "rating", page = 1, limit = 20 } = options;
  const conditions: string[] = ["tp.is_deleted = false"];
  const params: unknown[] = [];
  let idx = 1;

  if (q) {
    conditions.push(`(tp.bio ILIKE $${idx} OR u.name ILIKE $${idx})`);
    params.push(`%${escapeIlike(q)}%`);
    idx++;
  }
  if (specialty) {
    conditions.push(`$${idx} = ANY(tp.specialties)`);
    params.push(specialty);
    idx++;
  }
  if (badge) {
    conditions.push(`tp.badge_status = $${idx}`);
    params.push(badge);
    idx++;
  }
  if (city) {
    conditions.push(`EXISTS (
      SELECT 1 FROM user_profiles up2
      JOIN cities c ON c.id = up2.home_city_id
      WHERE up2.user_id = tp.user_id AND c.slug = $${idx}
    )`);
    params.push(city);
    idx++;
  }

  const where = conditions.join(" AND ");
  let orderBy: string;
  switch (sort) {
    case "review_count": orderBy = "tp.review_count DESC NULLS LAST"; break;
    case "name": orderBy = "u.name ASC"; break;
    default: orderBy = "tp.aggregate_rating DESC NULLS LAST"; break;
  }

  const countResult = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const offset = (page - 1) * limit;
  const result = await db().query<TeacherProfile>(
    `SELECT tp.id, tp.user_id, tp.bio, tp.specialties, tp.badge_status,
            tp.aggregate_rating, tp.review_count, tp.is_deleted, tp.deleted_at,
            tp.created_at, tp.updated_at
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  return { teachers: result.rows, total };
}

export async function deleteTeacherProfile(profileId: string): Promise<boolean> {
  // Check existence before update (PGlite rowCount unreliable)
  const existing = await db().query(
    `SELECT id FROM teacher_profiles WHERE id = $1 AND is_deleted = false`,
    [profileId],
  );
  if (existing.rows.length === 0) return false;

  // Anonymise: clear PII, set deleted
  await db().query(
    `UPDATE teacher_profiles
     SET bio = NULL, specialties = '{}', badge_status = 'revoked',
         aggregate_rating = NULL, review_count = 0,
         is_deleted = true, deleted_at = now(), updated_at = now()
     WHERE id = $1`,
    [profileId],
  );

  // Delete photos from DB (blob cleanup handled separately)
  await db().query(`DELETE FROM teacher_photos WHERE teacher_profile_id = $1`, [profileId]);

  // Anonymise certifications
  await db().query(
    `UPDATE certifications SET name = 'Removed', issuing_body = 'Removed',
     proof_document_url = NULL, status = 'revoked', updated_at = now()
     WHERE teacher_profile_id = $1`,
    [profileId],
  );

  return true;
}
