/**
 * API Contract: Teacher Profiles
 * Spec 005 — Teacher profile CRUD, application, deletion
 *
 * Base path: /api/teachers
 */

// ─── Enums & Shared Types ──────────────────────────────────────────

export type BadgeStatus = 'pending' | 'verified' | 'expired' | 'revoked';

export type TeacherRequestStatus = 'pending' | 'approved' | 'rejected';

export const TEACHER_SPECIALTIES = [
  'washing_machines',
  'hand_to_hand',
  'therapeutic',
  'standing',
  'l_basing',
  'whips_pops',
  'icarian',
  'partner_acrobatics',
  'yoga',
  'dance',
  'other',
] as const;

export type TeacherSpecialty = (typeof TEACHER_SPECIALTIES)[number];

// ─── Teacher Profile Types ──────────────────────────────────────────

export interface TeacherProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  specialties: TeacherSpecialty[];
  cityId: string | null;
  cityName: string | null;
  averageRating: number | null; // 1.00–5.00 or null
  reviewCount: number;
  badgeStatus: BadgeStatus;
  verifiedAt: string | null; // ISO 8601
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Public-facing summary for lists and cards */
export interface TeacherSummary {
  id: string;
  displayName: string;
  specialties: TeacherSpecialty[];
  cityName: string | null;
  averageRating: number | null;
  reviewCount: number;
  badgeStatus: BadgeStatus;
  primaryPhotoUrl: string | null;
}

// ─── GET /api/teachers — List/search teachers ───────────────────────

export interface ListTeachersQuery {
  city?: string;              // city slug (e.g., "bristol")
  specialty?: TeacherSpecialty; // filter by specialty
  specialties?: TeacherSpecialty[]; // filter by multiple (AND)
  badgeStatus?: BadgeStatus;  // default: 'verified'
  search?: string;            // search by display name
  sortBy?: 'rating' | 'name' | 'recent'; // default: 'rating'
  page?: number;
  pageSize?: number;          // default: 20, max: 50
}

export interface ListTeachersResponse {
  teachers: TeacherSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Auth: Public (unauthenticated allowed)
 * Default filter: badge_status = 'verified', is_deleted = false
 * Errors: 400 (invalid query params)
 */

// ─── GET /api/teachers/:id — Get teacher profile ────────────────────

export interface GetTeacherResponse {
  teacher: TeacherProfile;
  certifications: {
    id: string;
    name: string;
    issuingBody: string;
    expiryDate: string | null;
    status: string;
    /** Never includes proof document URL — admin-only access */
    hasProofDocument: boolean;
  }[];
  photos: {
    id: string;
    url: string;
    sortOrder: number;
  }[];
  /** Recent events this teacher taught (last 10) */
  recentEvents: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    role: 'lead' | 'assistant';
    cityName: string;
  }[];
  /** Upcoming events this teacher is assigned to */
  upcomingEvents: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    role: 'lead' | 'assistant';
    cityName: string;
  }[];
}

/**
 * Auth: Public
 * Returns full profile with certs (no proof doc URLs), photos, teaching history
 * Deleted teachers return: { teacher: { displayName: "Deleted Teacher", isDeleted: true, ... }, ... }
 * Errors: 404 (teacher not found)
 */

// ─── PATCH /api/teachers/:id — Update own profile ───────────────────

export interface UpdateTeacherRequest {
  bio?: string;               // max 1000 chars
  specialties?: TeacherSpecialty[];
  cityId?: string;
}

export interface UpdateTeacherResponse {
  teacher: TeacherProfile;
}

/**
 * Auth: Authenticated — must be the profile owner
 * Errors: 400 (validation), 403 (not owner), 404
 */

// ─── POST /api/teachers/apply — Submit teacher application ──────────

export interface SubmitTeacherApplicationRequest {
  cityId: string;             // primary teaching city
  bio?: string;
  specialties: TeacherSpecialty[];
  certifications: {
    name: string;             // e.g., "AcroYoga International Level 2"
    issuingBody: string;      // e.g., "AcroYoga International"
    expiryDate?: string;      // ISO date, optional
  }[];
}

export interface SubmitTeacherApplicationResponse {
  request: TeacherRequest;
}

/**
 * Auth: Authenticated member
 * Flow:
 *  1. Validate request (Zod)
 *  2. Check no pending application exists for this user
 *  3. Create teacher_requests row (status: pending)
 *  4. Proof documents uploaded separately via POST /api/teachers/apply/proof
 *  5. Queue notification to scoped admin (at city level)
 *
 * Errors: 400 (validation), 403 (not authenticated),
 *         409 (pending application already exists)
 */

// ─── Teacher Request Types ──────────────────────────────────────────

export interface TeacherRequest {
  id: string;
  userId: string;
  cityId: string;
  cityName: string;
  bio: string | null;
  specialties: TeacherSpecialty[];
  submittedCertifications: {
    name: string;
    issuingBody: string;
    expiryDate: string | null;
    hasProofDocument: boolean;
  }[];
  status: TeacherRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
}

// ─── GET /api/teachers/requests — List teacher requests (admin) ─────

export interface ListTeacherRequestsQuery {
  status?: TeacherRequestStatus; // default: 'pending'
  cityId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListTeacherRequestsResponse {
  requests: (TeacherRequest & {
    applicantDisplayName: string;
    applicantEmail: string;
  })[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Auth: Scoped admin — sees requests within their geographic scope
 * Uses withPermission('approveTeacherRequests', scopeFromCity)
 * Errors: 403 (not scoped admin)
 */

// ─── PATCH /api/teachers/requests/:id — Approve or reject ──────────

export interface ReviewTeacherRequestBody {
  decision: 'approved' | 'rejected';
  reason?: string;            // required for rejection, optional for approval
}

export interface ReviewTeacherRequestResponse {
  request: TeacherRequest;    // updated status
  /** Included only when approved — the created teacher profile */
  teacherProfile?: {
    id: string;
    badgeStatus: BadgeStatus;
  };
}

/**
 * Auth: Scoped admin at the request's city scope
 * On approval:
 *  1. Create teacher_profiles row (badge_status: verified)
 *  2. Create certifications rows (status: verified)
 *  3. Queue notification to applicant (approved)
 * On rejection:
 *  1. Update request status
 *  2. Queue notification to applicant (rejected, with reason)
 *
 * Errors: 400 (invalid decision), 403 (not admin for scope),
 *         404 (request not found), 409 (already reviewed)
 */

// ─── DELETE /api/teachers/:id — Delete teacher account ──────────────

export interface DeleteTeacherResponse {
  /** Confirmation of anonymisation */
  anonymised: true;
}

/**
 * Auth: Authenticated — must be the profile owner OR scoped admin
 * Anonymisation procedure (within transaction):
 *  1. Set display_name = 'Deleted Teacher', clear bio/specialties/rating
 *  2. Hard-delete teacher_photos + blob storage photos
 *  3. Anonymise certifications, hard-delete proof doc blobs
 *  4. Update event_teachers.teacher_display_name to "Deleted Teacher"
 *  5. Set is_deleted = true, deleted_at = now()
 * Reviews remain with "Deleted Teacher" attribution (community content)
 *
 * Errors: 403 (not owner or admin), 404
 */
