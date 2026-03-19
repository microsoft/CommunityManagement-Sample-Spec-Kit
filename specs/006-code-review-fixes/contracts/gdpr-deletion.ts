/**
 * GDPR Deletion Extension Contract — Spec 006
 *
 * Extends the existing account deletion function to cover
 * Spec 005 (Teacher Profiles & Reviews) tables.
 */

// ── Deletion Steps (new, appended to existing flow) ───────────────

/**
 * These steps are inserted between the existing Spec 004 deletion
 * steps and the final user record deletion. The order respects
 * foreign key constraints.
 */
interface GDPRDeletionExtension {
  /** New deletion steps for Spec 005 tables */
  steps: [
    { order: 21; table: 'review_reminders'; condition: 'user_id = $userId' },
    { order: 22; table: 'reviews'; condition: 'reviewer_id = $userId'; note: 'Reviews authored by the user' },
    { order: 23; table: 'reviews'; condition: 'teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)'; note: 'Reviews about the user as a teacher' },
    { order: 24; table: 'event_teachers'; condition: 'teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)' },
    { order: 25; table: 'teacher_photos'; condition: 'teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)' },
    { order: 26; table: 'certifications'; condition: 'teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)' },
    { order: 27; table: 'teacher_requests'; condition: 'user_id = $userId' },
    { order: 28; table: 'teacher_profiles'; condition: 'user_id = $userId' },
  ];

  /** Existing steps (Specs 001-004) MUST NOT be modified */
  existingStepsModified: false;

  /** All deletions run within a single transaction */
  transactional: true;
}

// ── Post-Deletion Verification ────────────────────────────────────

/**
 * After deletion, a verification query MUST confirm zero rows
 * remain for the deleted user across all tables.
 *
 * Test should run:
 *   SELECT COUNT(*) FROM <table> WHERE <user_condition>
 * for each of the 28 tables and assert all return 0.
 */
interface GDPRVerificationContract {
  /** Total tables checked for zero remaining rows */
  tableCount: 28;
  /** User ID is the primary identifier for deletion */
  deletionKey: 'user_id';
  /** Some tables use subquery via teacher_profiles.user_id */
  indirectTables: [
    'reviews',
    'event_teachers',
    'teacher_photos',
    'certifications',
  ];
}
