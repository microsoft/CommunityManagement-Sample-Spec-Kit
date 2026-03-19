/**
 * Performance Fixes Contract — Spec 006
 *
 * Defines the batch-loading patterns that replace N+1 queries
 * in message thread loading and follower/following lists.
 */

// ── Batch Block Status (Thread Messages) ──────────────────────────

/**
 * GET /api/threads/[id]/messages
 *
 * Current: per-message isBlocked(senderId, currentUserId) call
 * Fixed: single upfront query for all blocked user IDs
 */
interface BatchBlockStatusContract {
  /** Single query to load all blocked IDs for current user */
  query: 'SELECT blocked_user_id FROM blocked_users WHERE blocker_user_id = $1';
  /** Result stored as Set<string> for O(1) lookup */
  resultType: 'Set<userId>';
  /** Applied to each message via: blockedSet.has(message.sender_id) */
  decorationPattern: 'in-memory set lookup';
  /** Query count: constant (1), not O(messageCount) */
  queryComplexity: 'O(1)';
}

// ── Batch Reaction Summaries (Thread Messages) ────────────────────

/**
 * GET /api/threads/[id]/messages
 *
 * Current: per-message getReactions(messageId) call
 * Fixed: single batch query with GROUP BY
 */
interface BatchReactionSummaryContract {
  /** Single query to load all reactions for the thread's messages */
  query: `SELECT message_id, emoji, COUNT(*) as count
          FROM message_reactions
          WHERE message_id = ANY($1)
          GROUP BY message_id, emoji`;
  /** Result stored as Map<messageId, { emoji: string, count: number }[]> */
  resultType: 'Map<messageId, ReactionSummary[]>';
  /** Applied to each message via: reactionMap.get(message.id) || [] */
  decorationPattern: 'in-memory map lookup';
  /** Query count: constant (1), not O(messageCount) */
  queryComplexity: 'O(1)';
}

// ── Batch Relationship Status (Followers/Following) ───────────────

/**
 * GET /api/follows/followers
 * GET /api/follows/following
 *
 * Current: per-entry getRelationshipStatus(userId, followId) call
 * Fixed: single batch query for the page of user IDs
 */
interface BatchRelationshipContract {
  /** Single query to check follow-back status for all IDs on page */
  query: `SELECT followee_id FROM follows
          WHERE follower_id = $1 AND followee_id = ANY($2)`;
  /** Result stored as Set<userId> for O(1) lookup */
  resultType: 'Set<userId>';
  /** Applied per entry: followBackSet.has(entry.user_id) */
  decorationPattern: 'in-memory set lookup';
  /** Query count: constant (1), not O(pageSize) */
  queryComplexity: 'O(1)';
}

// ── Performance Constraint ────────────────────────────────────────

/**
 * After these fixes, all list endpoints satisfy Constitution
 * Principle VI: "List endpoints MUST NOT execute per-item queries."
 *
 * Query count for any list response is O(1) with respect to
 * the number of items in the result set.
 */
