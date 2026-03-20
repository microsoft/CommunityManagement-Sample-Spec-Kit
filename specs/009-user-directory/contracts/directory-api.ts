/**
 * API Contract: User Directory
 * Spec 009 — Directory search, filter, pagination, visibility toggle
 *
 * Base path: /api/directory
 */

/**
 * NOTE: SocialPlatform and DefaultRole are canonical in packages/shared/src/types/community.ts.
 * T004 expands SocialPlatform from 4→8 values in that file. This contract uses the same
 * canonical source — do NOT redefine these types here. Import from community.ts at implementation.
 *
 * Canonical imports at implementation time:
 *   import type { SocialPlatform, DefaultRole } from '@acroyoga/shared/types/community';
 */

// ─── Enums ──────────────────────────────────────────────────────────

/** Expanded from Spec 002's 4-value set to 8 values — canonical in community.ts */
export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'website'
  | 'tiktok'
  | 'twitter_x'
  | 'linkedin'
  | 'threads';

/** Canonical in community.ts — 'base' | 'flyer' | 'hybrid' */
export type DefaultRole = 'base' | 'flyer' | 'hybrid';

export type DirectorySortMode = 'alphabetical' | 'recent' | 'proximity';

export type RelationshipFilter = 'friends' | 'following' | 'followers' | 'blocked';

export type RelationshipStatus = 'friend' | 'following' | 'follows_me' | 'none' | 'blocked';

// ─── Core Types ─────────────────────────────────────────────────────

export interface VisibleSocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface DirectoryEntry {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  defaultRole: DefaultRole;
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
  /** ISO 8601 — account creation date (for "recently joined" display) */
  createdAt: string;
}

// ─── GET /api/directory — Search & browse the community directory ───

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

export interface DirectoryResponse {
  entries: DirectoryEntry[];
  /** Opaque cursor for the next page. Null if no more results. */
  nextCursor: string | null;
  /** Whether more results exist beyond this page */
  hasNextPage: boolean;
  /** Total count of results matching the current filters (optional — may be omitted for perf) */
  totalCount?: number;
}

/**
 * Auth: Authenticated member (requireAuth())
 * Method: GET
 * Path: /api/directory
 *
 * Query params validated by Zod at API boundary.
 * All filtering, visibility checks, and block exclusion are server-side.
 *
 * Behaviour:
 *  - Returns only users with directory_visible = true (unless relationship = 'blocked')
 *  - Excludes blocked users in both directions (symmetric hiding)
 *  - Excludes the requesting user from results
 *  - Social links filtered by visibility settings and viewer relationship
 *  - Proximity sort requires viewer to have a home city; falls back to alphabetical if not
 *  - All filters combine with AND logic
 *
 * Errors:
 *  401 — Not authenticated
 *  400 — Invalid query params (Zod validation failure)
 */

// ─── PATCH /api/profiles/me — Toggle directory visibility ───────────

/**
 * Extends the existing profile update endpoint from Spec 002.
 * Adds `directoryVisible` to the accepted body fields.
 */
export interface UpdateDirectoryVisibilityRequest {
  directoryVisible: boolean;
}

/**
 * Auth: Authenticated member (requireAuth()) — own profile only
 * Method: PATCH
 * Path: /api/profiles/me
 *
 * This is an extension to the existing PATCH /api/profiles/me from Spec 002.
 * The request body may include `directoryVisible` alongside other profile fields.
 *
 * Errors:
 *  401 — Not authenticated
 *  400 — Invalid body (Zod validation failure)
 */

// ─── Profile Completeness (computed, not an API endpoint) ───────────

/**
 * Computed at render time on the user's own profile page.
 * NOT an API response — calculated from existing profile data.
 * See FR-026, FR-027, FR-028.
 */
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

// ─── Existing Spec 002 action endpoints reused from directory cards ──

/**
 * Follow/unfollow and block/unblock actions from directory cards reuse
 * the existing Spec 002 endpoints:
 *
 * - POST   /api/follows           — Follow a user
 * - DELETE  /api/follows/:userId   — Unfollow a user
 * - POST   /api/blocks            — Block a user
 * - DELETE  /api/blocks/:userId    — Unblock a user
 *
 * No new endpoints needed. The directory UI calls these existing APIs
 * and optimistically updates the card's relationship status.
 */
