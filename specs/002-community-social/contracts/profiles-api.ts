/**
 * API Contract: User Profiles
 * Spec 002 — Profile CRUD, home city, privacy settings
 *
 * Base path: /api/profiles
 */

import type { City } from '../../001-event-discovery-rsvp/contracts/cities-api';
import type { AcroRole } from '../../001-event-discovery-rsvp/contracts/events-api';

// ─── Enums ──────────────────────────────────────────────────────────

export type SocialPlatform = 'facebook' | 'instagram' | 'youtube' | 'website';

export type LinkVisibility = 'everyone' | 'followers' | 'friends' | 'hidden';

export type Relationship = 'self' | 'friend' | 'follower' | 'none';

// ─── Core Types ─────────────────────────────────────────────────────

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  visibility: LinkVisibility;
}

export interface UserProfilePublic {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  homeCityName: string | null;
  homeCitySlug: string | null;
  defaultRole: AcroRole;
  avatarUrl: string | null;
  /** Filtered by viewer's relationship to profile owner (Principle III) */
  socialLinks: SocialLink[];
  followerCount: number;
  followingCount: number;
  friendCount: number;
  /** Relationship of the requesting user to this profile */
  relationship: Relationship;
  /** Whether requesting user follows this profile */
  isFollowing: boolean;
  /** Whether this profile is blocked (mutual hide — returns 404 instead) */
  createdAt: string;
}

export interface UserProfileSelf extends UserProfilePublic {
  /** All social links with visibility settings — visible only to owner */
  socialLinks: (SocialLink & { visibility: LinkVisibility })[];
  homeCityId: string | null;
  email: string;
}

// ─── GET /api/profiles/:userId — View a profile ─────────────────────

/**
 * Auth: Public (visitor sees aggregate only), Authenticated (sees filtered links)
 *
 * Behaviour:
 *  - If viewer has blocked or is blocked by the profile owner → 404 (silent block)
 *  - Social links filtered by visibility × relationship (see research R-2)
 *  - Follower/following/friend counts always visible
 *
 * Errors: 404 (user not found or blocked)
 */
export type GetProfileResponse = UserProfilePublic;

// ─── GET /api/profiles/me — View own profile ────────────────────────

/**
 * Auth: Authenticated
 * Returns full profile with all social links and settings.
 */
export type GetMyProfileResponse = UserProfileSelf;

// ─── PUT /api/profiles/me — Update own profile ──────────────────────

export interface UpdateProfileRequest {
  displayName?: string;        // 1–100 chars
  bio?: string | null;         // max 500 chars, null to clear
  homeCityId?: string | null;  // FK to cities table (from 001), null to clear
  defaultRole?: AcroRole;
  avatarUrl?: string | null;
}

export interface UpdateProfileResponse {
  profile: UserProfileSelf;
}

/**
 * Auth: Authenticated (own profile only)
 * Validation: Zod schema at API boundary
 * Errors: 400 (validation), 404 (city not found)
 */

// ─── PUT /api/profiles/me/social-links — Set social links ───────────

export interface SetSocialLinksRequest {
  links: {
    platform: SocialPlatform;
    url: string;
    visibility: LinkVisibility;
  }[];
}

export interface SetSocialLinksResponse {
  links: SocialLink[];
}

/**
 * Auth: Authenticated (own profile only)
 * Behaviour: Upsert — replaces all links for matched platforms. Platforms not included are removed.
 * Validation: max 1 link per platform, valid URLs
 * Errors: 400 (validation — invalid URL, duplicate platform)
 */

// ─── POST /api/profiles/me/detect-city — Auto-detect home city ──────

export interface DetectCityRequest {
  lat: number;
  lon: number;
}

export interface DetectCityResponse {
  /** Reuses Spec 001 nearest city response */
  city: City | null;
  distanceKm: number | null;
  matched: boolean;
}

/**
 * Auth: Authenticated
 * Implementation: Delegates to Spec 001's geolocation snap (GET /api/cities/nearest)
 * If matched, client can call PUT /api/profiles/me with homeCityId
 */
