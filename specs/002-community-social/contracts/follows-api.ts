/**
 * API Contract: Follows & Friends
 * Spec 002 — Unidirectional follow, mutual = friends
 *
 * Base path: /api/follows
 */

// ─── Core Types ─────────────────────────────────────────────────────

export interface FollowEntry {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  /** Whether the follow is mutual (both directions exist) */
  isMutual: boolean;
  createdAt: string; // ISO 8601
}

// ─── POST /api/follows — Follow a user ──────────────────────────────

export interface CreateFollowRequest {
  followeeId: string;
}

export interface CreateFollowResponse {
  follow: {
    id: string;
    followerId: string;
    followeeId: string;
    createdAt: string;
  };
  /** True if the follow made the relationship mutual (now friends) */
  becameFriends: boolean;
}

/**
 * Auth: Authenticated member
 * Validation:
 *  - Cannot follow yourself
 *  - Cannot follow if blocked in either direction
 *  - Cannot duplicate an existing follow
 *
 * Errors: 400 (self-follow), 403 (not authenticated), 404 (user not found),
 *         409 (already following), 422 (blocked)
 */

// ─── DELETE /api/follows/:followeeId — Unfollow a user ──────────────

export interface UnfollowResponse {
  /** True if unfollowing broke a mutual (were friends, now not) */
  wasFriends: boolean;
}

/**
 * Auth: Authenticated member
 * Errors: 404 (not following this user)
 */

// ─── GET /api/follows/followers — List my followers ─────────────────

export interface ListFollowersQuery {
  page?: number;     // 1-based, default 1
  pageSize?: number; // default 20, max 100
}

export interface ListFollowersResponse {
  followers: FollowEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Auth: Authenticated
 * Returns users who follow the authenticated user.
 * Each entry indicates whether the follow is mutual (friends).
 */

// ─── GET /api/follows/following — List who I follow ─────────────────

export interface ListFollowingQuery {
  page?: number;
  pageSize?: number;
}

export interface ListFollowingResponse {
  following: FollowEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Auth: Authenticated
 */

// ─── GET /api/follows/friends — List mutual follows (friends) ───────

export interface ListFriendsQuery {
  page?: number;
  pageSize?: number;
}

export interface ListFriendsResponse {
  friends: FollowEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Auth: Authenticated
 * Returns only mutual follows.
 */
