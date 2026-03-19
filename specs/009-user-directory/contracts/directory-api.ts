/**
 * API Contract: User Directory — Spec 009
 *
 * GET  /api/directory             — Search/browse the directory (auth required)
 * GET  /api/directory/visibility  — Get current visibility setting (auth required)
 * PATCH /api/directory/visibility — Toggle directory opt-in (auth required)
 */

import type {
  DirectoryEntry,
  DirectorySearchParams,
  DirectorySearchResponse,
  SetDirectoryVisibilityRequest,
} from "@acroyoga/shared/types/directory";

export type { DirectoryEntry, DirectorySearchParams, DirectorySearchResponse };

// ─── GET /api/directory ──────────────────────────────────────────────────────

/** Query string parameters accepted by GET /api/directory */
export type DirectoryQueryParams = {
  q?: string;                   // text search (display_name, bio)
  cityId?: string;              // UUID: filter by home city
  role?: "base" | "flyer" | "hybrid"; // filter by default role
  verifiedTeacher?: "true";     // if present, only verified teachers
  relationship?: "following" | "followers" | "friends"; // filter by relationship
  sort?: "name" | "proximity";  // sort order (default: name)
  cursor?: string;              // pagination cursor
  limit?: string;               // coerced to number, max 50
};

/** Success response for GET /api/directory */
export type DirectoryResponse = DirectorySearchResponse;

// ─── GET /api/directory/visibility ───────────────────────────────────────────

/** Response for GET /api/directory/visibility */
export interface GetVisibilityResponse {
  visible: boolean;
}

// ─── PATCH /api/directory/visibility ─────────────────────────────────────────

/** Request body for PATCH /api/directory/visibility */
export type SetVisibilityRequest = SetDirectoryVisibilityRequest;

/** Response for PATCH /api/directory/visibility */
export interface SetVisibilityResponse {
  visible: boolean;
}

// ─── Error responses ─────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}
