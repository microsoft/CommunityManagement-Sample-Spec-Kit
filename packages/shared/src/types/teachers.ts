import type { ConcessionStatusValue } from "./recurring";

// --- Teacher Profiles ---
export type BadgeStatus = "pending" | "verified" | "expired" | "revoked";
export type CertificationStatus = "pending" | "verified" | "expired" | "revoked";
export type TeacherRequestStatus = "pending" | "approved" | "rejected";
export type TeacherRole = "lead" | "assistant";

export const TEACHER_SPECIALTIES = [
  "washing_machines",
  "hand_to_hand",
  "therapeutic",
  "whips_and_pops",
  "icarian",
  "standing",
  "l_basing",
  "partner_acrobatics",
  "dance_acro",
  "flow",
  "coaching",
  "choreography",
] as const;
export type TeacherSpecialty = (typeof TEACHER_SPECIALTIES)[number];

export interface TeacherProfile {
  id: string;
  user_id: string;
  bio: string | null;
  specialties: string[];
  badge_status: BadgeStatus;
  aggregate_rating: string | null;
  review_count: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherProfileDetail extends TeacherProfile {
  user_name: string;
  user_email: string;
  certifications: Certification[];
  photos: TeacherPhoto[];
  upcoming_event_count: number;
  past_event_count: number;
}

export interface Certification {
  id: string;
  teacher_profile_id: string;
  name: string;
  issuing_body: string;
  expiry_date: string | null;
  proof_document_url: string | null;
  status: CertificationStatus;
  verified_by_admin_id: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherPhoto {
  id: string;
  teacher_profile_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface EventTeacher {
  id: string;
  event_id: string;
  teacher_profile_id: string;
  role: TeacherRole;
  created_at: string;
}

export interface EventTeacherDetail extends EventTeacher {
  teacher_name: string;
  badge_status: BadgeStatus;
  specialties: string[];
}

export interface Review {
  id: string;
  event_id: string;
  teacher_profile_id: string;
  reviewer_id: string;
  rating: number;
  text: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  hidden_by: string | null;
  review_window_closes_at: string;
  created_at: string;
}

export interface PublicReview {
  id: string;
  event_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  text: string | null;
  created_at: string;
  event_title: string;
}

export interface TeacherRequest {
  id: string;
  user_id: string;
  bio: string | null;
  specialties: string[];
  credentials: CredentialEntry[];
  status: TeacherRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface CredentialEntry {
  name: string;
  issuingBody: string;
  expiryDate?: string;
  proofDocumentUrl?: string;
}

// --- Request types ---
export interface SubmitTeacherApplicationRequest {
  bio?: string;
  specialties: string[];
  credentials: CredentialEntry[];
}

export interface ReviewTeacherRequestAction {
  decision: "approved" | "rejected";
  reason?: string;
}

export interface UpdateTeacherProfileRequest {
  bio?: string;
  specialties?: string[];
}

export interface CreateCertificationRequest {
  name: string;
  issuingBody: string;
  expiryDate?: string;
}

export interface UpdateCertificationRequest {
  name?: string;
  issuingBody?: string;
  expiryDate?: string;
}

export interface VerifyCertificationRequest {
  decision: "verified" | "revoked";
}

export interface AssignTeacherRequest {
  teacherProfileId: string;
  role?: TeacherRole;
}

export interface SubmitReviewRequest {
  teacherProfileId: string;
  rating: number;
  text?: string;
}

export interface ModerateReviewRequest {
  action: "hide" | "unhide";
  reason?: string;
}

export interface StarDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ReviewReminderRecord {
  id: string;
  event_id: string;
  user_id: string;
  reminder_day: number;
  sent_at: string;
}
