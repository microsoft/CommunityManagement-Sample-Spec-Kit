import { db } from "@/lib/db/client";
import type {
  Review,
  PublicReview,
  SubmitReviewRequest,
  StarDistribution,
} from "@acroyoga/shared/types/teachers";

const REVIEW_WINDOW_DAYS = parseInt(process.env.REVIEW_WINDOW_DAYS ?? "14", 10);

export async function submitReview(
  eventId: string,
  reviewerId: string,
  data: SubmitReviewRequest,
): Promise<Review> {
  // Verify the reviewer attended the event (has confirmed RSVP)
  const rsvp = await db().query(
    `SELECT id FROM rsvps
     WHERE event_id = $1 AND user_id = $2 AND status = 'confirmed'`,
    [eventId, reviewerId],
  );
  if (rsvp.rows.length === 0) {
    throw new Error("You can only review events you attended");
  }

  // Verify the teacher was assigned to this event
  const assignment = await db().query(
    `SELECT id FROM event_teachers
     WHERE event_id = $1 AND teacher_profile_id = $2`,
    [eventId, data.teacherProfileId],
  );
  if (assignment.rows.length === 0) {
    throw new Error("Teacher was not assigned to this event");
  }

  // Verify we're within the review window
  const event = await db().query<{ end_datetime: string; start_datetime: string }>(
    `SELECT start_datetime, end_datetime FROM events WHERE id = $1`,
    [eventId],
  );
  if (event.rows.length === 0) {
    throw new Error("Event not found");
  }

  const eventEnd = new Date(event.rows[0].end_datetime);
  const windowCloses = new Date(eventEnd.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now < eventEnd) {
    throw new Error("Cannot review an event that hasn't ended yet");
  }
  if (now > windowCloses) {
    throw new Error("The review window for this event has closed");
  }

  const result = await db().query<Review>(
    `INSERT INTO reviews (event_id, teacher_profile_id, reviewer_id, rating, text, review_window_closes_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, event_id, teacher_profile_id, reviewer_id, rating, text,
               is_hidden, hidden_reason, hidden_by, review_window_closes_at, created_at`,
    [eventId, data.teacherProfileId, reviewerId, data.rating, data.text ?? null, windowCloses.toISOString()],
  );

  // Recalculate aggregate
  await recalculateAggregate(data.teacherProfileId);

  return result.rows[0];
}

export async function listReviewsForTeacher(
  teacherProfileId: string,
  page = 1,
  limit = 20,
): Promise<{ reviews: PublicReview[]; total: number; distribution: StarDistribution }> {
  const offset = (page - 1) * limit;

  const countResult = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM reviews
     WHERE teacher_profile_id = $1 AND is_hidden = false`,
    [teacherProfileId],
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db().query<PublicReview>(
    `SELECT r.id, r.event_id, r.reviewer_id, u.name as reviewer_name,
            r.rating, r.text, r.created_at, e.title as event_title
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     JOIN events e ON e.id = r.event_id
     WHERE r.teacher_profile_id = $1 AND r.is_hidden = false
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [teacherProfileId, limit, offset],
  );

  // Star distribution
  const distResult = await db().query<{ rating: number; count: string }>(
    `SELECT rating, COUNT(*)::text as count FROM reviews
     WHERE teacher_profile_id = $1 AND is_hidden = false
     GROUP BY rating`,
    [teacherProfileId],
  );

  const distribution: StarDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distResult.rows) {
    distribution[row.rating as keyof StarDistribution] = parseInt(row.count, 10);
  }

  return { reviews: result.rows, total, distribution };
}

export async function listReviewsForEvent(
  eventId: string,
  teacherProfileId?: string,
  page = 1,
  limit = 20,
): Promise<{ reviews: PublicReview[]; total: number }> {
  const offset = (page - 1) * limit;
  const conditions = ["r.event_id = $1", "r.is_hidden = false"];
  const params: unknown[] = [eventId];
  let idx = 2;

  if (teacherProfileId) {
    conditions.push(`r.teacher_profile_id = $${idx++}`);
    params.push(teacherProfileId);
  }

  const where = conditions.join(" AND ");

  const countResult = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM reviews r WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db().query<PublicReview>(
    `SELECT r.id, r.event_id, r.reviewer_id, u.name as reviewer_name,
            r.rating, r.text, r.created_at, e.title as event_title
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     JOIN events e ON e.id = r.event_id
     WHERE ${where}
     ORDER BY r.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  return { reviews: result.rows, total };
}

export async function recalculateAggregate(teacherProfileId: string): Promise<void> {
  const result = await db().query<{ avg_rating: string; review_count: string }>(
    `SELECT COALESCE(AVG(rating), 0)::text as avg_rating, COUNT(*)::text as review_count
     FROM reviews
     WHERE teacher_profile_id = $1 AND is_hidden = false`,
    [teacherProfileId],
  );

  const avg = parseFloat(result.rows[0].avg_rating);
  const count = parseInt(result.rows[0].review_count, 10);

  await db().query(
    `UPDATE teacher_profiles
     SET aggregate_rating = $2, review_count = $3, updated_at = now()
     WHERE id = $1`,
    [teacherProfileId, count > 0 ? avg.toFixed(2) : null, count],
  );
}

export async function hideReview(
  reviewId: string,
  adminId: string,
  reason?: string,
): Promise<Review | null> {
  const result = await db().query<Review>(
    `UPDATE reviews SET is_hidden = true, hidden_by = $2, hidden_reason = $3
     WHERE id = $1
     RETURNING id, event_id, teacher_profile_id, reviewer_id, rating, text,
               is_hidden, hidden_reason, hidden_by, review_window_closes_at, created_at`,
    [reviewId, adminId, reason ?? null],
  );

  if (result.rows.length > 0) {
    await recalculateAggregate(result.rows[0].teacher_profile_id);
  }

  return result.rows[0] ?? null;
}

export async function unhideReview(
  reviewId: string,
): Promise<Review | null> {
  const result = await db().query<Review>(
    `UPDATE reviews SET is_hidden = false, hidden_by = NULL, hidden_reason = NULL
     WHERE id = $1
     RETURNING id, event_id, teacher_profile_id, reviewer_id, rating, text,
               is_hidden, hidden_reason, hidden_by, review_window_closes_at, created_at`,
    [reviewId],
  );

  if (result.rows.length > 0) {
    await recalculateAggregate(result.rows[0].teacher_profile_id);
  }

  return result.rows[0] ?? null;
}

/**
 * Process review reminders. Called by daily job.
 * Sends reminders at day 1 and day 10 after event end, 
 * for attendees who haven't reviewed yet.
 */
export async function processReviewReminders(): Promise<number> {
  let sent = 0;

  for (const day of [1, 10]) {
    const pendingReminders = await db().query<{
      event_id: string;
      user_id: string;
      teacher_profile_id: string;
    }>(
      `SELECT DISTINCT r.event_id, r.user_id, et.teacher_profile_id
       FROM rsvps r
       JOIN events e ON e.id = r.event_id
       JOIN event_teachers et ON et.event_id = e.id
       WHERE r.status = 'confirmed'
         AND e.end_datetime + interval '${day} days' <= now()
         AND e.end_datetime + interval '${day + 1} days' > now()
         AND NOT EXISTS (
           SELECT 1 FROM reviews rv
           WHERE rv.event_id = r.event_id AND rv.reviewer_id = r.user_id
         )
         AND NOT EXISTS (
           SELECT 1 FROM review_reminders rr
           WHERE rr.event_id = r.event_id AND rr.user_id = r.user_id AND rr.reminder_day = ${day}
         )`,
    );

    for (const reminder of pendingReminders.rows) {
      await db().query(
        `INSERT INTO review_reminders (event_id, user_id, reminder_day)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [reminder.event_id, reminder.user_id, day],
      );
      sent++;
    }
  }

  return sent;
}
