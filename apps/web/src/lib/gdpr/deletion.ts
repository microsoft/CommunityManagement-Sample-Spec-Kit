import { db } from "@/lib/db/client";

const DELETED_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function deleteAccount(userId: string, confirmation: string): Promise<boolean> {
  if (confirmation !== "DELETE") {
    throw new Error("Must confirm with 'DELETE'");
  }

  if (userId === DELETED_USER_ID) {
    throw new Error("Cannot delete sentinel user");
  }

  // Verify user exists
  const userExists = await db().query(
    `SELECT 1 FROM users WHERE id = $1`,
    [userId],
  );
  if (userExists.rows.length === 0) {
    throw new Error("User not found");
  }

  // 11-step deletion sequence in order:

  // 1. Delete social links
  await db().query(`DELETE FROM social_links WHERE user_id = $1`, [userId]);

  // 2. Delete user profile
  await db().query(`DELETE FROM user_profiles WHERE user_id = $1`, [userId]);

  // 3. Delete follows (both directions)
  await db().query(
    `DELETE FROM follows WHERE follower_id = $1 OR followee_id = $1`,
    [userId],
  );

  // 4. Delete blocks (both directions)
  await db().query(
    `DELETE FROM blocks WHERE blocker_id = $1 OR blocked_id = $1`,
    [userId],
  );

  // 5. Delete mutes (both directions)
  await db().query(
    `DELETE FROM mutes WHERE muter_id = $1 OR muted_id = $1`,
    [userId],
  );

  // 6. Anonymise messages: replace content with [deleted], set author to Deleted User
  await db().query(
    `UPDATE messages
     SET content = '[deleted]', is_deleted = true, deleted_by = $2, author_id = $2
     WHERE author_id = $1`,
    [userId, DELETED_USER_ID],
  );

  // 7. Delete reactions by user
  await db().query(`DELETE FROM reactions WHERE user_id = $1`, [userId]);

  // 8. Delete reports by user (as reporter)
  await db().query(`DELETE FROM reports WHERE reporter_id = $1`, [userId]);

  // 9. Anonymise reports about user (keep for record but remove PII link)
  await db().query(
    `UPDATE reports SET reported_user_id = $2 WHERE reported_user_id = $1`,
    [userId, DELETED_USER_ID],
  );

  // 10. Delete data exports
  await db().query(`DELETE FROM data_exports WHERE user_id = $1`, [userId]);

  // === Spec 005 Teacher/Review tables (steps 11–17, FK-safe order) ===

  // 11. Delete review reminders for this user
  await db().query(`DELETE FROM review_reminders WHERE user_id = $1`, [userId]);

  // 12. Delete reviews authored by this user
  await db().query(`DELETE FROM reviews WHERE reviewer_id = $1`, [userId]);

  // 13. Delete reviews about this user's teacher profile(s)
  await db().query(
    `DELETE FROM reviews WHERE teacher_profile_id IN (
       SELECT id FROM teacher_profiles WHERE user_id = $1
     )`,
    [userId],
  );

  // 14. Delete event_teachers entries for this user's teacher profile(s)
  await db().query(
    `DELETE FROM event_teachers WHERE teacher_profile_id IN (
       SELECT id FROM teacher_profiles WHERE user_id = $1
     )`,
    [userId],
  );

  // 15. Delete teacher photos
  await db().query(
    `DELETE FROM teacher_photos WHERE teacher_profile_id IN (
       SELECT id FROM teacher_profiles WHERE user_id = $1
     )`,
    [userId],
  );

  // 16. Delete certifications
  await db().query(
    `DELETE FROM certifications WHERE teacher_profile_id IN (
       SELECT id FROM teacher_profiles WHERE user_id = $1
     )`,
    [userId],
  );

  // 17. Delete teacher requests
  await db().query(`DELETE FROM teacher_requests WHERE user_id = $1`, [userId]);

  // 18. Delete teacher profiles
  await db().query(`DELETE FROM teacher_profiles WHERE user_id = $1`, [userId]);

  // 19. Anonymise user record (keep for aggregate FK integrity)
  await db().query(
    `UPDATE users SET email = $2, name = 'Deleted User' WHERE id = $1`,
    [userId, `deleted_${userId}@system.local`],
  );

  return true;
}
