// User Directory feature types — Spec 009

import type { DefaultRole, SocialPlatform } from "./community";

export type DirectorySortMode = 'alphabetical' | 'recent' | 'proximity';
export type RelationshipFilter = 'friends' | 'following' | 'followers' | 'blocked';
export type RelationshipStatus = 'friend' | 'following' | 'follows_me' | 'none' | 'blocked';

export interface VisibleSocialLink {
  platform: SocialPlatform;
  url: string;
}

/** A single entry in the community directory. */
export interface DirectoryEntry {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  defaultRole: DefaultRole | null;
  /** Human-readable city name or null if not set */
  homeCity: string | null;
  /** Human-readable country name or null */
  homeCountry: string | null;
  /** true if user has badge_status = 'verified' in teacher_profiles */
  isVerifiedTeacher: boolean;
  /** Social links filtered by the viewer's relationship to this user */
  visibleSocialLinks: VisibleSocialLink[];
  /** Viewer's relationship to this directory entry */
  relationshipStatus: RelationshipStatus;
  /** ISO 8601 — account creation date */
  createdAt: string;
}

/** Query parameters for GET /api/directory */
export interface DirectoryQueryParams {
  /** Opaque cursor for pagination (base64-encoded). Omit for first page. */
  cursor?: string;
  /** Number of results per page. Default 20, max 100. */
  pageSize?: number;
  /** Sort mode. Default 'alphabetical'. */
  sort?: DirectorySortMode;
  /** Filter by acro role */
  role?: DefaultRole;
  /** Filter by city key (from geography table) */
  city?: string;
  /** Filter by country key */
  country?: string;
  /** Filter by continent key */
  continent?: string;
  /** Filter to verified teachers only */
  teachersOnly?: boolean;
  /** Filter by relationship to the viewer */
  relationship?: RelationshipFilter;
  /** Text search on display name (case-insensitive prefix match) */
  search?: string;
}

/** Response for GET /api/directory */
export interface DirectoryResponse {
  entries: DirectoryEntry[];
  /** Opaque cursor for the next page. Null if no more results. */
  nextCursor: string | null;
  /** Whether more results exist beyond this page */
  hasNextPage: boolean;
  /** Total count of results matching the current filters (optional) */
  totalCount?: number;
}

/** Request body for PATCH /api/directory/visibility */
export interface SetDirectoryVisibilityRequest {
  visible: boolean;
}

/** Profile completeness — computed at render time, not stored (FR-026, FR-027) */
export interface ProfileCompleteness {
  /** 0–100 in increments of 20 */
  percentage: number;
  fields: {
    avatar: boolean;
    displayName: boolean;
    bio: boolean;
    homeCity: boolean;
    socialLink: boolean;
  };
}
