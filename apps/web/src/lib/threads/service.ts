import { db } from "@/lib/db/client";
import { getMutedUserIds } from "@/lib/safety/mutes";
import { getThreadAccess } from "@/lib/threads/access";
import type {
  Thread,
  Message,
  EditHistoryEntry,
  ReactionSummary,
  ReactionEmoji,
  ThreadEntityType,
} from "@acroyoga/shared/types/community";

interface ThreadRow {
  id: string;
  entity_type: string;
  entity_id: string;
  is_locked: boolean;
  locked_by: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  edit_history: unknown;
  is_pinned: boolean;
  pinned_by: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  created_at: string;
  edited_at: string | null;
}

function rowToThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    entityType: row.entity_type as ThreadEntityType,
    entityId: row.entity_id,
    isLocked: row.is_locked,
    createdAt: row.created_at,
  };
}

export async function getOrCreateThread(
  entityType: ThreadEntityType,
  entityId: string,
): Promise<Thread> {
  const existing = await db().query<ThreadRow>(
    `SELECT * FROM threads WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, entityId],
  );

  if (existing.rows.length > 0) {
    return rowToThread(existing.rows[0]);
  }

  const result = await db().query<ThreadRow>(
    `INSERT INTO threads (entity_type, entity_id)
     VALUES ($1, $2)
     ON CONFLICT (entity_type, entity_id) DO UPDATE SET entity_type = EXCLUDED.entity_type
     RETURNING *`,
    [entityType, entityId],
  );

  return rowToThread(result.rows[0]);
}

export async function getThreadByEntity(
  entityType: ThreadEntityType,
  entityId: string,
): Promise<Thread | null> {
  const result = await db().query<ThreadRow>(
    `SELECT * FROM threads WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, entityId],
  );
  return result.rows.length > 0 ? rowToThread(result.rows[0]) : null;
}

export async function listMessages(
  threadId: string,
  viewerId: string | null,
  cursor?: string,
  limit = 50,
): Promise<{ messages: Message[]; nextCursor: string | null }> {
  const mutedIds = viewerId ? await getMutedUserIds(viewerId) : [];

  let query = `
    SELECT m.*, u.name as author_name
    FROM messages m
    LEFT JOIN users u ON u.id = m.author_id
    WHERE m.thread_id = $1`;
  const params: unknown[] = [threadId];
  let idx = 2;

  if (cursor) {
    query += ` AND m.created_at > (SELECT created_at FROM messages WHERE id = $${idx++})`;
    params.push(cursor);
  }

  query += ` ORDER BY m.created_at ASC LIMIT $${idx++}`;
  params.push(limit + 1);

  const result = await db().query<MessageRow>(query, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  // Batch-load blocked user IDs for the viewer (fixes N+1)
  const blockedSet = viewerId ? await getBlockedUserIds(viewerId) : new Set<string>();

  // Batch-load reaction summaries for all message IDs (fixes N+1)
  const messageIds = rows.map((r) => r.id);
  const reactionsMap = await getReactionSummariesBatch(messageIds, viewerId);

  const messages: Message[] = [];
  for (const row of rows) {
    if (viewerId && row.author_id !== viewerId && blockedSet.has(row.author_id)) continue;
    if (mutedIds.includes(row.author_id)) continue;

    const reactions = reactionsMap.get(row.id) ?? [];

    const editHistory = Array.isArray(row.edit_history)
      ? (row.edit_history as EditHistoryEntry[])
      : [];

    messages.push({
      id: row.id,
      threadId: row.thread_id,
      authorId: row.author_id,
      authorName: row.is_deleted ? "Deleted User" : row.author_name,
      content: row.is_deleted ? "[deleted]" : row.content,
      editHistory: row.is_deleted ? [] : editHistory,
      isPinned: row.is_pinned,
      isDeleted: row.is_deleted,
      reactions,
      createdAt: row.created_at,
      editedAt: row.edited_at,
    });
  }

  const nextCursor = hasMore ? rows[rows.length - 1].id : null;
  return { messages, nextCursor };
}

export async function createMessage(
  threadId: string,
  authorId: string,
  content: string,
): Promise<Message> {
  const access = await getThreadAccess(threadId, authorId);
  if (!access.canPost) {
    throw new Error(access.reason ?? "Cannot post to this thread");
  }

  const result = await db().query<MessageRow>(
    `INSERT INTO messages (thread_id, author_id, content)
     VALUES ($1, $2, $3)
     RETURNING *, (SELECT name FROM users WHERE id = $2) as author_name`,
    [threadId, authorId, content],
  );

  const row = result.rows[0];
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    authorName: row.author_name,
    content: row.content,
    editHistory: [],
    isPinned: false,
    isDeleted: false,
    reactions: [],
    createdAt: row.created_at,
    editedAt: null,
  };
}

export async function editMessage(
  messageId: string,
  authorId: string,
  newContent: string,
): Promise<Message | null> {
  const existing = await db().query<MessageRow>(
    `SELECT m.*, u.name as author_name FROM messages m
     LEFT JOIN users u ON u.id = m.author_id
     WHERE m.id = $1`,
    [messageId],
  );

  if (existing.rows.length === 0) return null;

  const msg = existing.rows[0];
  if (msg.author_id !== authorId) {
    throw new Error("Only the author can edit this message");
  }
  if (msg.is_deleted) {
    throw new Error("Cannot edit a deleted message");
  }

  const oldHistory = Array.isArray(msg.edit_history)
    ? (msg.edit_history as EditHistoryEntry[])
    : [];
  const newHistory = [
    ...oldHistory,
    { content: msg.content, editedAt: new Date().toISOString() },
  ];

  const result = await db().query<MessageRow>(
    `UPDATE messages
     SET content = $2, edit_history = $3::jsonb, edited_at = now()
     WHERE id = $1
     RETURNING *, (SELECT name FROM users WHERE id = author_id) as author_name`,
    [messageId, newContent, JSON.stringify(newHistory)],
  );

  const row = result.rows[0];
  const reactions = await getReactionSummary(row.id, authorId);
  const editHistory = Array.isArray(row.edit_history)
    ? (row.edit_history as EditHistoryEntry[])
    : [];

  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    authorName: row.author_name,
    content: row.content,
    editHistory,
    isPinned: row.is_pinned,
    isDeleted: false,
    reactions,
    createdAt: row.created_at,
    editedAt: row.edited_at,
  };
}

export async function deleteMessage(
  messageId: string,
  deleterId: string,
  isAdmin: boolean,
): Promise<boolean> {
  const existing = await db().query<{ author_id: string; is_deleted: boolean }>(
    `SELECT author_id, is_deleted FROM messages WHERE id = $1`,
    [messageId],
  );

  if (existing.rows.length === 0) return false;

  const msg = existing.rows[0];
  if (msg.is_deleted) return false;

  if (msg.author_id !== deleterId && !isAdmin) {
    throw new Error("Only the author or an admin can delete this message");
  }

  await db().query(
    `UPDATE messages SET is_deleted = true, deleted_by = $2, content = '[deleted]'
     WHERE id = $1`,
    [messageId, deleterId],
  );

  // Remove reactions on deleted message
  await db().query(`DELETE FROM reactions WHERE message_id = $1`, [messageId]);

  return true;
}

export async function lockThread(
  threadId: string,
  locked: boolean,
  adminId: string,
): Promise<Thread | null> {
  const exists = await db().query(`SELECT 1 FROM threads WHERE id = $1`, [threadId]);
  if (exists.rows.length === 0) return null;

  const result = await db().query<ThreadRow>(
    `UPDATE threads SET is_locked = $2, locked_by = $3 WHERE id = $1 RETURNING *`,
    [threadId, locked, locked ? adminId : null],
  );

  return rowToThread(result.rows[0]);
}

export async function pinMessage(
  messageId: string,
  adminId: string,
  pinned: boolean,
): Promise<boolean> {
  const msg = await db().query<{ thread_id: string; is_deleted: boolean }>(
    `SELECT thread_id, is_deleted FROM messages WHERE id = $1`,
    [messageId],
  );

  if (msg.rows.length === 0) return false;
  if (msg.rows[0].is_deleted) return false;

  if (pinned) {
    // Enforce max 3 pinned per thread
    const pinnedCount = await db().query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM messages WHERE thread_id = $1 AND is_pinned = true`,
      [msg.rows[0].thread_id],
    );
    if (parseInt(pinnedCount.rows[0].cnt, 10) >= 3) {
      throw new Error("Maximum 3 pinned messages per thread");
    }
  }

  await db().query(
    `UPDATE messages SET is_pinned = $2, pinned_by = $3 WHERE id = $1`,
    [messageId, pinned, pinned ? adminId : null],
  );

  return true;
}

// Reactions
export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: ReactionEmoji,
): Promise<{ action: "added" | "removed"; count: number }> {
  const existing = await db().query(
    `SELECT 1 FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji],
  );

  if (existing.rows.length > 0) {
    await db().query(
      `DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, emoji],
    );
  } else {
    await db().query(
      `INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)`,
      [messageId, userId, emoji],
    );
  }

  const countResult = await db().query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM reactions WHERE message_id = $1 AND emoji = $2`,
    [messageId, emoji],
  );

  return {
    action: existing.rows.length > 0 ? "removed" : "added",
    count: parseInt(countResult.rows[0].cnt, 10),
  };
}

/** Batch-load all user IDs that have any block relationship with `userId`. */
async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const result = await db().query<{ other_id: string }>(
    `SELECT CASE WHEN blocker_id = $1 THEN blocked_id ELSE blocker_id END AS other_id
     FROM blocks
     WHERE blocker_id = $1 OR blocked_id = $1`,
    [userId],
  );
  return new Set(result.rows.map((r) => r.other_id));
}

/** Batch-load reaction summaries for multiple messages in a single query. */
async function getReactionSummariesBatch(
  messageIds: string[],
  viewerId: string | null,
): Promise<Map<string, ReactionSummary[]>> {
  const map = new Map<string, ReactionSummary[]>();
  if (messageIds.length === 0) return map;

  const result = await db().query<{
    message_id: string;
    emoji: string;
    cnt: string;
    user_reacted: boolean;
  }>(
    `SELECT
       r.message_id,
       r.emoji,
       COUNT(*) as cnt,
       COALESCE(bool_or(r.user_id = $2), false) as user_reacted
     FROM reactions r
     WHERE r.message_id = ANY($1)
     GROUP BY r.message_id, r.emoji`,
    [messageIds, viewerId],
  );

  for (const r of result.rows) {
    const arr = map.get(r.message_id) ?? [];
    arr.push({
      emoji: r.emoji as ReactionEmoji,
      count: parseInt(r.cnt, 10),
      reacted: r.user_reacted,
    });
    map.set(r.message_id, arr);
  }
  return map;
}

async function getReactionSummary(
  messageId: string,
  viewerId: string | null,
): Promise<ReactionSummary[]> {
  const result = await db().query<{
    emoji: string;
    cnt: string;
    user_reacted: boolean;
  }>(
    `SELECT
       r.emoji,
       COUNT(*) as cnt,
       COALESCE(bool_or(r.user_id = $2), false) as user_reacted
     FROM reactions r
     WHERE r.message_id = $1
     GROUP BY r.emoji`,
    [messageId, viewerId],
  );

  return result.rows.map((r) => ({
    emoji: r.emoji as ReactionEmoji,
    count: parseInt(r.cnt, 10),
    reacted: r.user_reacted,
  }));
}
