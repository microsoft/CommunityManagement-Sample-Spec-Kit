// Scheduled job definitions — Spec 015
//
// Cron-triggered functions for periodic background tasks.
// These are registered by the worker process via pg-boss cron schedules.

import { db } from "@/lib/db/client";
import { createNotification } from "@/lib/notifications/service";
import { NotificationType } from "@acroyoga/shared/types/notifications";

/**
 * Review Reminder Job — runs weekly (Mon 9am UTC)
 * Finds events completed in the past week without reviews from attendees.
 * Enqueues reminder notifications for each attendee.
 */
export async function reviewReminderJob(): Promise<number> {
  // Find confirmed attendees of events that ended in the past 7 days
  // who haven't submitted reviews yet
  const result = await db().query<{
    user_id: string;
    event_id: string;
    event_title: string;
  }>(
    `SELECT DISTINCT r.user_id, e.id AS event_id, e.title AS event_title
     FROM rsvps r
     JOIN events e ON r.event_id = e.id
     LEFT JOIN reviews rv ON rv.event_id = e.id AND rv.reviewer_id = r.user_id
     WHERE e.end_datetime BETWEEN now() - interval '7 days' AND now()
       AND e.status = 'published'
       AND r.status = 'confirmed'
       AND rv.id IS NULL`,
  );

  let count = 0;
  for (const row of result.rows) {
    await createNotification({
      userId: row.user_id,
      type: NotificationType.REVIEW_REMINDER,
      body: `You attended "${row.event_title}" recently — consider leaving a review for the teacher.`,
      resourceType: "event",
      resourceId: row.event_id,
    });
    count++;
  }

  return count;
}

/**
 * Certification Expiry Check — runs daily (8am UTC)
 * Finds verified certifications expiring within 30 days.
 * Sends warning notifications to the teacher.
 */
export async function certExpiryJob(): Promise<number> {
  const result = await db().query<{
    teacher_profile_id: string;
    user_id: string;
    cert_name: string;
    cert_id: string;
  }>(
    `SELECT c.id AS cert_id, c.teacher_profile_id, tp.user_id, c.name AS cert_name
     FROM certifications c
     JOIN teacher_profiles tp ON c.teacher_profile_id = tp.id
     WHERE c.status = 'verified'
       AND c.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '30 days'`,
  );

  let count = 0;
  for (const row of result.rows) {
    await createNotification({
      userId: row.user_id,
      type: NotificationType.CERT_EXPIRY_WARNING,
      body: `Your certification "${row.cert_name}" will expire within 30 days.`,
      resourceType: "certification",
      resourceId: row.cert_id,
    });
    count++;
  }

  return count;
}

/**
 * Waitlist Cleanup Job — runs daily (2am UTC)
 * Removes stale waitlist entries for events that have already passed.
 */
export async function waitlistCleanupJob(): Promise<number> {
  // Count before delete (PGlite rowCount unreliable)
  const countResult = await db().query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM waitlist w
     JOIN events e ON w.event_id = e.id
     WHERE e.end_datetime < now()
       AND w.promoted_at IS NULL
       AND w.expired_at IS NULL`,
  );
  const count = parseInt(countResult.rows[0].count);

  if (count > 0) {
    await db().query(
      `UPDATE waitlist SET expired_at = now()
       WHERE event_id IN (
         SELECT id FROM events WHERE end_datetime < now()
       )
       AND promoted_at IS NULL
       AND expired_at IS NULL`,
    );
  }

  return count;
}
