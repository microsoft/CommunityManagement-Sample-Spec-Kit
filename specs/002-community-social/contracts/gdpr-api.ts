/**
 * API Contract: GDPR — Data Export & Account Deletion
 * Spec 002 — Data export, account deletion, privacy controls
 *
 * Base path: /api/account
 */

// ─── Data Export Types ──────────────────────────────────────────────

export type ExportStatus = 'pending' | 'processing' | 'ready' | 'expired' | 'failed';

export interface DataExport {
  id: string;
  userId: string;
  status: ExportStatus;
  downloadUrl: string | null;
  fileSizeBytes: number | null;
  expiresAt: string | null;
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
}

// ─── POST /api/account/export — Request data export ─────────────────

export interface RequestExportResponse {
  export: DataExport;
}

/**
 * Auth: Authenticated (own account only)
 * Behaviour:
 *  1. Creates a data_exports row with status = 'pending'
 *  2. Background job generates JSON with all user data (FR-06):
 *     - Profile, social links
 *     - RSVPs, event interests
 *     - Credits
 *     - Messages authored (content, timestamps, edit history)
 *     - Follows (following + followers)
 *     - Blocks and mutes
 *  3. On completion: status → 'ready', download_url set, expires in 7 days
 *  4. Notification sent (in-app + email if enabled)
 *
 * Constraint: One active (pending/processing) export per user at a time
 * Errors: 403 (not authenticated), 409 (export already in progress)
 */

// ─── GET /api/account/exports — List my exports ─────────────────────

export interface ListExportsResponse {
  exports: DataExport[];
}

/** Auth: Authenticated */

// ─── GET /api/account/exports/:id/download — Download export file ───

/**
 * Auth: Authenticated (must be the export owner)
 * Returns: JSON file (Content-Type: application/json, Content-Disposition: attachment)
 * Errors: 403, 404, 410 (expired)
 */

// ─── Export File Schema ─────────────────────────────────────────────

export interface ExportFileSchema {
  exportedAt: string; // ISO 8601
  userId: string;
  profile: {
    displayName: string;
    bio: string | null;
    homeCityName: string | null;
    defaultRole: string;
    avatarUrl: string | null;
  };
  socialLinks: {
    platform: string;
    url: string;
    visibility: string;
  }[];
  rsvps: {
    eventId: string;
    eventTitle: string;
    role: string;
    status: string;
    createdAt: string;
  }[];
  eventInterests: {
    eventId: string;
    eventTitle: string;
    createdAt: string;
  }[];
  credits: {
    creatorId: string;
    amount: number;
    currency: string;
    remainingBalance: number;
    issuedFromEventId: string;
    createdAt: string;
  }[];
  messagesAuthored: {
    threadEntityType: string;
    threadEntityId: string;
    content: string;
    editHistory: { content: string; editedAt: string }[];
    createdAt: string;
  }[];
  follows: {
    following: { userId: string; displayName: string; createdAt: string }[];
    followers: { userId: string; displayName: string; createdAt: string }[];
  };
  blocks: { userId: string; createdAt: string }[];
  mutes: { userId: string; createdAt: string }[];
}

// ─── DELETE /api/account — Delete account ───────────────────────────

export interface DeleteAccountRequest {
  /** User must type "DELETE" to confirm (UX safety net, validated server-side) */
  confirmation: 'DELETE';
}

export interface DeleteAccountResponse {
  /** Always true on success — account is immediately and irrecoverably deleted */
  deleted: boolean;
}

/**
 * Auth: Authenticated (own account only)
 *
 * Deletion sequence (FR-07):
 *  1. Delete reactions on user's authored messages
 *  2. Delete reactions BY the user
 *  3. Anonymise messages: content → "[deleted]", author_id → sentinel
 *  4. Delete follows (both directions)
 *  5. Delete blocks and mutes (both directions)
 *  6. Delete social links
 *  7. Anonymise RSVPs: user_id → sentinel (preserves aggregate counts)
 *  8. Anonymise reports by user: reporter_id → sentinel
 *  9. Delete data exports
 * 10. Nullify user profile PII: display_name → "Deleted User", email/bio/avatar → null
 * 11. Invalidate auth session
 *
 * All within a single transaction.
 * The sentinel user UUID: 00000000-0000-0000-0000-000000000000
 *
 * Errors: 400 (invalid confirmation), 403 (not authenticated)
 */
