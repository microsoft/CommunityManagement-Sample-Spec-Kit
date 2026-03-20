// User Directory feature types — Spec 009

import type { DefaultRole, Relationship, SocialLink } from "./community";

export type DirectoryRelationshipFilter = "following" | "followers" | "friends";
export type DirectorySortOrder = "name" | "proximity";

/** A single entry in the community directory. */
export interface DirectoryEntry {
  userId: string;
  displayName: string | null;
  bio: string | null;
  homeCityName: string | null;
  defaultRole: DefaultRole | null;
  avatarUrl: string | null;
  /** Social links filtered to the viewer's relationship level. */
  socialLinks: SocialLink[];
  /** Viewer's relationship to this member. */
  relationship: Relationship;
  /** True when this user has an active verified teacher badge. */
  isVerifiedTeacher: boolean;
  /** Profile completeness score 0–100. */
  profileCompleteness: number;
  /** ISO timestamp when the user joined (users.created_at). */
  joinedAt: string;
}

/** Query parameters for GET /api/directory */
export interface DirectorySearchParams {
  /** Free-text search on display_name and bio (ILIKE). */
  q?: string;
  /** Filter by home city UUID. */
  cityId?: string;
  /** Filter by AcroYoga role. */
  role?: DefaultRole;
  /** When true, only show verified teachers. */
  verifiedTeacher?: boolean;
  /** Filter by viewer's relationship to members. */
  relationship?: DirectoryRelationshipFilter;
  /** Sort order. Defaults to 'name'. */
  sort?: DirectorySortOrder;
  /** Opaque cursor for the next page (base64-encoded). */
  cursor?: string;
  /** Page size. Default 20, max 50. */
  limit?: number;
}

/** Response for GET /api/directory */
export interface DirectorySearchResponse {
  entries: DirectoryEntry[];
  /** Cursor to pass as `cursor` for the next page, or null if no more pages. */
  nextCursor: string | null;
  /** Total matching members (without pagination). */
  total: number;
}

/** Request body for PATCH /api/directory/visibility */
export interface SetDirectoryVisibilityRequest {
  visible: boolean;
}
