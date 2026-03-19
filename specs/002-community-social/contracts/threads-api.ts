/**
 * API Contract: Discussion Threads & Messages
 * Spec 002 — Event discussion threads, messages, reactions, moderation
 *
 * Base paths:
 *   /api/threads/:threadId/messages
 *   /api/threads/:threadId
 */

// ─── Enums ──────────────────────────────────────────────────────────

export type ThreadEntityType = 'event';

export type ReactionEmoji = 'thumbs_up' | 'heart' | 'fire' | 'laugh' | 'clap' | 'thinking';

// ─── Core Types ─────────────────────────────────────────────────────

export interface Thread {
  id: string;
  entityType: ThreadEntityType;
  entityId: string;
  isLocked: boolean;
  messageCount: number;
  createdAt: string;
}

export interface EditHistoryEntry {
  content: string;
  editedAt: string; // ISO 8601
}

export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  /** Whether the requesting user has placed this reaction */
  reacted: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  content: string;
  editHistory: EditHistoryEntry[];
  isPinned: boolean;
  pinnedBy: string | null;
  isDeleted: boolean;
  reactions: ReactionSummary[];
  createdAt: string;
  editedAt: string | null;
}

// ─── GET /api/threads/by-entity/:entityType/:entityId — Get thread ──

export interface GetThreadByEntityResponse {
  thread: Thread;
}

/**
 * Auth: Public (read-only for non-attendees), Authenticated for posting
 * Errors: 404 (no thread for this entity)
 */

// ─── GET /api/threads/:threadId/messages — List messages ────────────

export interface ListMessagesQuery {
  /** Cursor-based pagination: messages before this ID */
  before?: string;
  /** Number of messages to return (default 50, max 100) */
  limit?: number;
}

export interface ListMessagesResponse {
  messages: Message[];
  /** Pinned messages always returned separately, sorted by pin date */
  pinnedMessages: Message[];
  /** True if more messages exist before the oldest returned */
  hasMore: boolean;
  /** Whether the requesting user can post (has active RSVP) */
  canPost: boolean;
  /** Whether the thread is locked (only admins can post) */
  isLocked: boolean;
}

/**
 * Auth: Public (read), Authenticated member (write access checked via RSVP)
 *
 * Filtering:
 *  - Messages from blocked users (in either direction) are excluded
 *  - Messages from muted users are excluded for the requesting user
 *  - Deleted messages show as { content: "[deleted]", isDeleted: true }
 *
 * Errors: 404 (thread not found)
 */

// ─── POST /api/threads/:threadId/messages — Post a message ──────────

export interface CreateMessageRequest {
  content: string; // 1–2000 characters
}

export interface CreateMessageResponse {
  message: Message;
}

/**
 * Auth: Authenticated member with active RSVP to the thread's event
 *  - Thread locked → only scoped admins can post
 *  - Blocked user → cannot post
 *
 * Validation: content 1–2000 chars (Zod), no attachments in v1
 * Errors: 400 (validation), 403 (not authenticated / no RSVP / thread locked),
 *         404 (thread not found), 422 (blocked from thread entity)
 */

// ─── PATCH /api/threads/:threadId/messages/:messageId — Edit message ─

export interface EditMessageRequest {
  content: string; // 1–2000 characters
}

export interface EditMessageResponse {
  message: Message;
}

/**
 * Auth: Authenticated — must be the message author
 * Behaviour:
 *  - Previous content pushed to editHistory
 *  - editedAt updated
 *  - No time limit on edits (FR-12)
 *
 * Errors: 400 (validation), 403 (not author), 404 (message not found)
 */

// ─── DELETE /api/threads/:threadId/messages/:messageId — Delete message

export interface DeleteMessageResponse {
  message: Message; // content = "[deleted]" or "[deleted by admin]"
}

/**
 * Auth: Message author OR scoped admin
 * Behaviour:
 *  - Author delete: content → "[deleted]", is_deleted = true, deleted_by = author
 *  - Admin delete: content → "[deleted by admin]", is_deleted = true, deleted_by = admin
 *  - Reactions on deleted message are preserved (visible for context)
 *
 * Errors: 403 (not author and not scoped admin), 404 (message not found)
 */

// ─── POST /api/threads/:threadId/messages/:messageId/reactions — Toggle reaction

export interface ToggleReactionRequest {
  emoji: ReactionEmoji;
}

export interface ToggleReactionResponse {
  /** 'added' if reaction was created, 'removed' if it already existed and was toggled off */
  action: 'added' | 'removed';
  reactions: ReactionSummary[];
}

/**
 * Auth: Authenticated member with RSVP to the thread's event
 * Behaviour: Toggle — if reaction (message, user, emoji) exists → DELETE, else → INSERT
 * Errors: 400 (invalid emoji), 403 (not authenticated / no RSVP), 404 (message not found)
 */

// ─── Admin Moderation ───────────────────────────────────────────────

// PATCH /api/threads/:threadId/lock — Lock/unlock thread

export interface SetThreadLockRequest {
  locked: boolean;
}

export interface SetThreadLockResponse {
  thread: Thread;
}

/**
 * Auth: Scoped admin (city/country/global) covering the thread's event city
 * Uses withPermission('moderateThread', scopeFromEventCity)
 * Errors: 403 (not scoped admin), 404 (thread not found)
 */

// PATCH /api/threads/:threadId/messages/:messageId/pin — Pin/unpin message

export interface SetMessagePinRequest {
  pinned: boolean;
}

export interface SetMessagePinResponse {
  message: Message;
}

/**
 * Auth: Scoped admin covering the thread's event city
 * Constraint: max 3 pinned messages per thread (FR-13)
 * Errors: 403, 404, 422 (max pins reached when pinning)
 */
