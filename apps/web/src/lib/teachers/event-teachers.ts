import { db } from "@/lib/db/client";
import type { EventTeacher, EventTeacherDetail, TeacherRole } from "@acroyoga/shared/types/teachers";

export async function assignTeacher(
  eventId: string,
  teacherProfileId: string,
  role: TeacherRole = "lead",
): Promise<EventTeacher> {
  // Verify teacher exists and is not deleted
  const teacher = await db().query(
    `SELECT id FROM teacher_profiles WHERE id = $1 AND is_deleted = false`,
    [teacherProfileId],
  );
  if (teacher.rows.length === 0) {
    throw new Error("Teacher profile not found");
  }

  const result = await db().query<EventTeacher>(
    `INSERT INTO event_teachers (event_id, teacher_profile_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, teacher_profile_id) DO UPDATE SET role = $3
     RETURNING id, event_id, teacher_profile_id, role, created_at`,
    [eventId, teacherProfileId, role],
  );
  return result.rows[0];
}

export async function removeTeacher(
  eventId: string,
  teacherProfileId: string,
): Promise<boolean> {
  const existing = await db().query(
    `SELECT id FROM event_teachers WHERE event_id = $1 AND teacher_profile_id = $2`,
    [eventId, teacherProfileId],
  );
  if (existing.rows.length === 0) return false;

  await db().query(
    `DELETE FROM event_teachers WHERE event_id = $1 AND teacher_profile_id = $2`,
    [eventId, teacherProfileId],
  );
  return true;
}

export async function listTeachersForEvent(eventId: string): Promise<EventTeacherDetail[]> {
  const result = await db().query<EventTeacherDetail>(
    `SELECT et.id, et.event_id, et.teacher_profile_id, et.role, et.created_at,
            u.name as teacher_name, tp.badge_status, tp.specialties
     FROM event_teachers et
     JOIN teacher_profiles tp ON tp.id = et.teacher_profile_id
     JOIN users u ON u.id = tp.user_id
     WHERE et.event_id = $1
     ORDER BY et.role, u.name`,
    [eventId],
  );
  return result.rows;
}

export async function listEventsForTeacher(
  teacherProfileId: string,
  type: "upcoming" | "past" = "upcoming",
): Promise<{ event_id: string; title: string; start_datetime: string; role: string }[]> {
  const now = new Date().toISOString();
  const comparison = type === "upcoming" ? ">" : "<=";

  const result = await db().query<{ event_id: string; title: string; start_datetime: string; role: string }>(
    `SELECT et.event_id, e.title, e.start_datetime, et.role
     FROM event_teachers et
     JOIN events e ON e.id = et.event_id
     WHERE et.teacher_profile_id = $1 AND e.start_datetime ${comparison} $2
     ORDER BY e.start_datetime ${type === "upcoming" ? "ASC" : "DESC"}`,
    [teacherProfileId, now],
  );
  return result.rows;
}
