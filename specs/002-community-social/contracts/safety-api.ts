/**
 * API Contract: Block, Mute & Report
 * Spec 002 — Safety and moderation tools
 *
 * Base paths:
 *   /api/blocks
 *   /api/mutes
 *   /api/reports
 */

// ─── Enums ──────────────────────────────────────────────────────────

export type ReportReason = 'harassment' | 'spam' | 'inappropriate' | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

// ─── Block Types ────────────────────────────────────────────────────

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

// ─── POST /api/blocks — Block a user ────────────────────────────────

export interface CreateBlockRequest {
  blockedId: string;
}

export interface CreateBlockResponse {
  block: Block;
  /** Follow relationships severed as a side effect */
  severedFollows: number;
}

/**
 * Auth: Authenticated member
 * Side effects:
 *  - DELETE follows in both directions between the pair
 *  - Blocked user cannot follow, message, or view blocker's profile
 *  - Silent — blocked user is NOT notified
 *
 * Errors: 400 (self-block), 403 (not authenticated), 404 (user not found),
 *         409 (already blocked)
 */

// ─── DELETE /api/blocks/:blockedId — Unblock a user ─────────────────

export interface UnblockResponse {
  /** True if the block was removed */
  unblocked: boolean;
}

/**
 * Auth: Authenticated member
 * Note: Unblocking does NOT restore previously severed follows — user must re-follow manually
 * Errors: 404 (not blocked)
 */

// ─── GET /api/blocks — List my blocks ───────────────────────────────

export interface ListBlocksResponse {
  blocks: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    blockedAt: string;
  }[];
  total: number;
}

/**
 * Auth: Authenticated
 * Returns users the authenticated user has blocked.
 */

// ─── Mute Types ─────────────────────────────────────────────────────

export interface Mute {
  id: string;
  muterId: string;
  mutedId: string;
  createdAt: string;
}

// ─── POST /api/mutes — Mute a user ─────────────────────────────────

export interface CreateMuteRequest {
  mutedId: string;
}

export interface CreateMuteResponse {
  mute: Mute;
}

/**
 * Auth: Authenticated member
 * Behaviour:
 *  - Muted user's messages hidden from muter's view in all threads
 *  - Does NOT affect follow/friend relationship (FR-10)
 *  - Silent — muted user is NOT notified
 *
 * Errors: 400 (self-mute), 403, 404 (user not found), 409 (already muted)
 */

// ─── DELETE /api/mutes/:mutedId — Unmute a user ────────────────────

export interface UnmuteResponse {
  unmuted: boolean;
}

/** Auth: Authenticated. Errors: 404 (not muted) */

// ─── GET /api/mutes — List my mutes ────────────────────────────────

export interface ListMutesResponse {
  mutes: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    mutedAt: string;
  }[];
  total: number;
}

/** Auth: Authenticated */

// ─── Report Types ───────────────────────────────────────────────────

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportedMessageId: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

// ─── POST /api/reports — Submit a report ────────────────────────────

export interface CreateReportRequest {
  reportedUserId: string;
  /** Optional — if reporting a specific message */
  reportedMessageId?: string;
  reason: ReportReason;
  details?: string; // max 1000 characters
}

export interface CreateReportResponse {
  report: Report;
}

/**
 * Auth: Authenticated member
 * Behaviour:
 *  - Report routed to scoped admin queue (by reported user's home city or event city)
 *  - Reporter receives confirmation
 *  - Rate limit: max 10 reports per user per 24h
 *
 * Errors: 400 (validation, self-report), 403, 404 (user/message not found),
 *         429 (rate limit exceeded)
 */

// ─── GET /api/reports — List reports (admin) ────────────────────────

export interface ListReportsQuery {
  status?: ReportStatus;  // filter by status (default: 'pending')
  page?: number;
  pageSize?: number;
}

export interface ListReportsResponse {
  reports: (Report & {
    reporterDisplayName: string;
    reportedUserDisplayName: string;
    reportedMessageContent: string | null;
  })[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Auth: Scoped admin — sees reports within their geographic scope
 * Uses withPermission('moderateReports', scopeFromReportedUserCity)
 * Errors: 403 (not scoped admin)
 */

// ─── PATCH /api/reports/:id — Review a report ──────────────────────

export interface ReviewReportRequest {
  status: 'reviewed' | 'actioned' | 'dismissed';
  reviewNotes?: string;
}

export interface ReviewReportResponse {
  report: Report;
}

/**
 * Auth: Scoped admin covering the reported user's city scope
 * Errors: 403, 404, 409 (already reviewed)
 */
