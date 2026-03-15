/**
 * API Contract: Event-Teacher Assignment
 * Spec 005 — Assign/remove verified teachers to/from events
 *
 * Base path: /api/events/:eventId/teachers
 */

import type { TeacherSpecialty, BadgeStatus } from './teachers-api';

// ─── Event Teacher Types ────────────────────────────────────────────

export type TeacherRole = 'lead' | 'assistant';

export interface EventTeacher {
  id: string;
  eventId: string;
  teacherProfileId: string;
  teacherDisplayName: string;
  teacherSpecialties: TeacherSpecialty[];
  teacherBadgeStatus: BadgeStatus;
  teacherAverageRating: number | null;
  teacherPhotoUrl: string | null;
  role: TeacherRole;
  assignedBy: string;
  createdAt: string;
}

// ─── GET /api/events/:eventId/teachers — List teachers for event ────

export interface ListEventTeachersResponse {
  teachers: EventTeacher[];
}

/**
 * Auth: Public
 * Returns all teachers assigned to the event with their profile summary.
 * For deleted teachers: teacherDisplayName = "Deleted Teacher", badge = "revoked"
 *
 * Errors: 404 (event not found)
 */

// ─── POST /api/events/:eventId/teachers — Assign a teacher ─────────

export interface AssignTeacherRequest {
  teacherProfileId: string;
  role?: TeacherRole;           // default: 'lead'
}

export interface AssignTeacherResponse {
  assignment: EventTeacher;
}

/**
 * Auth: Event creator (owner of the event) OR scoped admin
 * Uses withPermission('editEvent', eventScope)
 *
 * Validation:
 *  1. Teacher must have badge_status = 'verified' (FR-06)
 *  2. Teacher does NOT need Event Creator role (FR-11)
 *  3. No duplicate assignment (event, teacher) — unique constraint
 *  4. Event must not be cancelled
 *
 * Side effects:
 *  - teacher_display_name populated from teacher's current display_name
 *  - Teacher receives notification of assignment (async)
 *
 * Errors: 400 (teacher not verified, event cancelled),
 *         403 (not event creator/admin),
 *         404 (event or teacher not found),
 *         409 (teacher already assigned to this event)
 */

// ─── DELETE /api/events/:eventId/teachers/:teacherProfileId — Remove ─

export interface RemoveTeacherResponse {
  removed: true;
}

/**
 * Auth: Event creator (owner) OR scoped admin
 * Uses withPermission('editEvent', eventScope)
 *
 * Side effects:
 *  - Teacher receives notification of removal (async)
 *  - Existing reviews for this teacher at this event are NOT affected
 *
 * Errors: 403 (not event creator/admin), 404 (assignment not found)
 */

// ─── PATCH /api/events/:eventId/teachers/:teacherProfileId — Update ─

export interface UpdateTeacherAssignmentRequest {
  role: TeacherRole;            // change between lead/assistant
}

export interface UpdateTeacherAssignmentResponse {
  assignment: EventTeacher;
}

/**
 * Auth: Event creator (owner) OR scoped admin
 * Errors: 400, 403, 404
 */

// ─── GET /api/teachers/search — Search verified teachers (for assignment picker) ─

export interface SearchTeachersForAssignmentQuery {
  search?: string;              // display name search
  specialty?: TeacherSpecialty;
  city?: string;                // city slug
  page?: number;
  pageSize?: number;            // default: 10
}

export interface SearchTeachersForAssignmentResponse {
  teachers: {
    id: string;
    displayName: string;
    specialties: TeacherSpecialty[];
    cityName: string | null;
    averageRating: number | null;
    primaryPhotoUrl: string | null;
  }[];
  total: number;
}

/**
 * Auth: Authenticated — used by event creators when assigning teachers
 * Only returns verified teachers (badge_status = 'verified')
 *
 * Errors: 403 (not authenticated)
 */
