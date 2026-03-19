# Research: Community & Social Features

**Spec**: 002 | **Date**: 2026-03-15

---

## R-1: Home City Auto-Detection — Reuse of Geolocation Snap

**Decision**: Reuse Spec 001's geolocation snap logic (`GET /api/cities/nearest` with Haversine, 100km threshold) during profile setup. When the user first visits their profile page, request browser geolocation and call the existing cities/nearest endpoint. If a match is found, pre-fill `homeCityId`. If no match, show the city picker (existing `GET /api/cities` endpoint).

**Rationale**: FR-03 specifies "Home city linked to platform city registry (FK to City entity). Auto-detection snaps to nearest registry city (100km threshold, same as spec 001)." The 001 implementation already handles the Haversine query against the cities table. We can reuse the endpoint directly — no new snap logic needed.

**Alternatives considered**:
- **Separate snap endpoint for profiles**: Duplicates logic. Violates Principle VII (Simplicity). The 001 endpoint returns a `City | null` which is exactly what profile setup needs.
- **IP-based geolocation**: Inaccurate (city-level at best, wrong for VPN users). Browser Geolocation API gives precise lat/lon. IP geo could be a fallback if browser geolocation is denied — but the downside (inaccuracy) outweighs the marginal UX improvement. Manual city picker is a sufficient fallback.
- **Storing raw lat/lon on user profile**: Violates Principle III (Privacy). The FK to city registry provides location context without storing precise coordinates.

**PGlite compatibility**: Haversine snap query from 001 works identically in PGlite.

---

## R-2: Social Link Visibility — Query-Time Filtering

**Decision**: Store social links with a `visibility` enum (`everyone`, `followers`, `friends`, `hidden`) per link. Visibility is enforced at query time in the profile service layer — the API never returns links the requesting user isn't authorised to see. No separate "public profile" vs "private profile" split — one unified query path with row-level filtering.

**Rationale**: FR-02 requires per-platform visibility toggles. FR-08 mandates "Profile visibility tiers applied at query time; no PII leakage in API." Filtering at the service layer (before serialisation) ensures the API contract is clean — the response shape is always `SocialLink[]`, but the array only contains visible links.

**Implementation**:
```typescript
function filterSocialLinks(
  links: SocialLink[],
  viewerId: string | null,
  relationship: 'self' | 'friend' | 'follower' | 'none'
): SocialLink[] {
  return links.filter(link => {
    if (link.visibility === 'everyone') return true;
    if (link.visibility === 'followers' && (relationship === 'follower' || relationship === 'friend' || relationship === 'self')) return true;
    if (link.visibility === 'friends' && (relationship === 'friend' || relationship === 'self')) return true;
    if (relationship === 'self') return true; // owner always sees their own
    return false;
  });
}
```

The relationship is computed from the `follows` table: if A→B and B→A exist, relation = 'friend'; if only A→B, relation = 'follower' (from B's perspective, A is a follower); if neither, relation = 'none'.

**Alternatives considered**:
- **Database-level row security (RLS)**: PostgreSQL RLS could filter rows per caller. But RLS adds complexity to PGlite testing (RLS support is limited in PGlite), and the filtering logic depends on the follow relationship which is application-level state. Service-layer filtering is simpler and fully testable.
- **Separate endpoints per visibility tier**: Over-engineering. One endpoint with contextual filtering is sufficient.
- **Pre-materialised visibility views**: Premature optimisation. The social_links table will have at most 4 rows per user (one per platform). No performance concern.

---

## R-3: Follow/Friend Relationship Model

**Decision**: Unidirectional `follows` table with `(follower_id, followee_id)`. "Friends" is a derived state computed at query time: two rows where A→B and B→A both exist. No separate `friends` table.

**Rationale**: FR-04 specifies "Unidirectional follow; mutual follows = friends." Storing follows as directed edges is the simplest model. Friend status is computed with a single JOIN or EXISTS subquery:

```sql
-- Check if A and B are friends
SELECT EXISTS (
  SELECT 1 FROM follows f1
  JOIN follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
  WHERE f1.follower_id = $userA AND f1.followee_id = $userB
);
```

**Follow/unfollow side effects**:
- Follow: INSERT into follows. Check if mutual → if so, both users now see "friends" label.
- Unfollow: DELETE from follows. If they were mutual, friendship is severed (both users downgraded to non-friend for visibility purposes).
- Block (from R-5): removes both follow directions.

**Count queries** (for profile display):
```sql
-- Follower count (how many people follow this user)
SELECT COUNT(*) FROM follows WHERE followee_id = $userId;
-- Following count (how many people this user follows)
SELECT COUNT(*) FROM follows WHERE follower_id = $userId;
-- Friend count (mutual follows)
SELECT COUNT(*) FROM follows f1
JOIN follows f2 ON f1.followee_id = f2.follower_id AND f1.follower_id = f2.followee_id
WHERE f1.follower_id = $userId;
```

**Alternatives considered**:
- **Bidirectional friends table**: Requires keeping two tables in sync. Adds a "friend request" workflow the spec doesn't call for. FR-04 is explicit: follow is unidirectional, mutual = friends. No accept/reject.
- **Graph database (Neo4j)**: Overkill for a follow/friend model with thousands of users. PostgreSQL adjacency list with indexed FKs is sufficient.
- **Materialised friend status**: An `is_friend` boolean on the follows table, updated via trigger on INSERT/DELETE. Avoids the JOIN but adds trigger complexity. Not justified at this scale — the JOIN is performant with indexes.

**PGlite compatibility**: Standard SQL joins — works identically in PGlite.

---

## R-4: Discussion Thread Architecture

**Decision**: Entity-polymorphic threads: a `threads` table with `(entity_type, entity_id)` where `entity_type = 'event'` and `entity_id` references the event. Messages belong to a thread. Thread auto-created on first message or RSVP to an event. Read-only access for non-attendees (can view but not post).

**Rationale**: FR-05 specifies "Per-event discussion threads; auto-subscribe on RSVP; read-only for non-attendees." The `entity_type` column enables future thread attachment to cities or other entities without schema changes.

**Thread access rules**:
1. **Attendees** (active RSVP): read + write
2. **RSVP'd then cancelled**: read-only (spec: "auto-subscribe on RSVP" — subscription persists)
3. **Non-attendees**: read-only
4. **Blocked users**: filtered from view (both directions — see R-5)
5. **Muted users**: messages hidden from muter's view only (see R-5)

**Auto-subscribe mechanic**: When a user RSVPs to an event, the thread already exists (created when the event is created or on first message). The RSVP itself grants write access — no separate subscription table needed. The thread service checks `rsvps` table to determine write access.

**Message ordering**: Messages ordered by `created_at ASC`, pinned messages floated to top. No pagination for v1 — threads are expected to be short (event logistics). If growth warrants it, cursor-based pagination can be added.

**Alternatives considered**:
- **Separate subscription/membership table**: The spec's "auto-subscribe on RSVP" means the RSVP **is** the subscription. A separate table would duplicate state.
- **Real-time WebSocket threads**: The spec says "discussion threads," not "chat." Standard request/response with polling is sufficient for v1. WebSocket can be added later under Principle VII.
- **External chat service (e.g., Stream, Ably)**: Adds cost and external dependency for a simple threaded discussion. Not justified per Principle VII (< 200 LOC of custom code handles it).

---

## R-5: Block/Mute System — Enforcement Points

**Decision**: Separate `blocks` and `mutes` tables. Enforcement at multiple layers:

**Block enforcement (FR-09)**:
1. **Follow API**: Before INSERT into follows, check blocks in both directions. Reject if blocked.
2. **Message API**: Before INSERT into messages, check if author is blocked by anyone in the thread (for event threads, check block between author and each viewer — actually, simpler: blocked user cannot write at all if either party has a block).
3. **Profile API**: Profile endpoint returns 404-like response for blocked users (mutual hide).
4. **Attendee list**: Filter blocked users from each other's view.
5. **On block creation**: Sever existing follows in both directions (DELETE from follows WHERE ...).

**Mute enforcement (FR-10)**:
1. **Message retrieval only**: When loading thread messages, exclude messages from muted users for the requesting user. No write prevention — muted user can still post, but muter doesn't see it.
2. **No follow/friend impact**: Muting does not affect follow relationships.
3. **Silent**: Muted user is never notified.

**Implementation — Block check helper**:
```typescript
async function isBlocked(userA: string, userB: string): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM blocks WHERE
      (blocker_id = $1 AND blocked_id = $2) OR
      (blocker_id = $2 AND blocked_id = $1)
    LIMIT 1`,
    [userA, userB]
  );
  return result.rowCount > 0;
}
```

Block check is symmetric: if A blocked B OR B blocked A, both see each other as hidden. This is by design — the blocked user shouldn't even know they're blocked (silent block).

**Alternatives considered**:
- **Single relationship table** (type: follow/block/mute): Conflates distinct concepts. A user can follow AND mute someone simultaneously (FR-10: "Does not sever follow/friend"). Separate tables avoid constraint conflicts.
- **Soft-block (hide without severing follows)**: Spec is explicit: block "severs follow/friend" (FR-09). Hard sever on block.
- **Thread-scoped muting**: Spec says "hides a user's messages in **all threads** from the muter's view" (FR-10). Global mute, not per-thread.

---

## R-6: Report System — Routing to Scoped Admins

**Decision**: Reports are stored with the reporter, reported user, reason, and optional details. Reports are routed to the admin moderation queue scoped to the reported user's home city (or event city if the report is on a message). Scoped admins at city/country/global level can review reports within their scope, using the same hierarchy resolution from Spec 004.

**Rationale**: FR-11 specifies "Routed to scoped admin moderation queue." The scoped admin concept is already implemented in 004's permission hierarchy. A City Admin for Bristol can review reports against users whose home city is Bristol. A Country Admin for UK can review all UK reports.

**Report scope resolution**:
- Report on a user profile → use reported user's `homeCityId` to determine scope
- Report on a message in an event thread → use the event's venue city to determine scope
- If reported user has no home city → route to global admins

**Alternatives considered**:
- **Flat unscoped queue**: All admins see all reports. Doesn't scale with multi-city platform. Spec 004 designed scoped permissions precisely for this.
- **Reporter's city scope**: The reporter's location is less relevant than the reported user's — the moderation action affects the reported user.
- **External moderation service**: Adds dependency. The report queue is simple CRUD with status transitions — well within custom code territory per Principle VII.

---

## R-7: GDPR Data Export — Async Job with Secure Download

**Decision**: Async background job triggered by user request. Collects all user data into a JSON file, stores it as an encrypted blob (or signed URL to temporary storage), notifies the user with a time-limited download link (7-day expiry). Uses a `data_exports` job table to track status.

**Rationale**: FR-06 specifies "async background job generates full JSON" with "secure, time-limited download link (expires after 7 days)." GDPR Article 15 requires export within 30 days — async is appropriate.

**Export contents** (from FR-06):
- Profile (display name, bio, home city, default role, avatar URL)
- Social links (all, regardless of visibility settings)
- RSVPs (all events with role, dates, status)
- Event interests / bookmarks
- Credits (balances and history)
- Messages authored (content, timestamps, edit history)
- Follows (who user follows, who follows user)
- Blocks and mutes (who user blocked/muted)
- **Excludes**: Messages authored by others, admin data

**Implementation flow**:
1. User requests export → INSERT into `data_exports` with status `pending`
2. Background job (cron or queue worker) picks up pending exports
3. Job queries all tables for user's data, assembles JSON
4. JSON stored to Azure Blob Storage (signed URL) or local temp file with signed download token
5. `data_exports` row updated: status `ready`, `download_url`, `expires_at = now() + 7 days`
6. Notification sent (in-app + email if enabled)
7. After expiry, cleanup job deletes the file

**v1 simplification**: For v1, the job can run synchronously on request if the data volume is small (single user's data). The async pattern is still used (status tracking table, notification) but the actual assembly happens immediately. True async queue deferred per Principle VII until needed.

**Alternatives considered**:
- **Synchronous endpoint returning JSON**: Blocks the request. For users with many messages/RSVPs, could timeout. Async is safer and matches the spec requirement.
- **Email attachment**: File size limits on email. Secure download link is more reliable.
- **Third-party GDPR tool**: Unnecessary dependency. The data is in our DB; querying + assembling JSON is straightforward.

**PGlite compatibility**: The export logic is standard SQL queries — works in PGlite. The file storage (Azure Blob) is mocked in tests.

---

## R-8: Account Deletion — Anonymisation Strategy

**Decision**: Hard-delete all PII fields. Anonymise messages in threads by replacing `content` with `"[deleted]"` and setting `author_id` to a sentinel "Deleted User" UUID. Remove reactions on the deleted user's messages. Retain anonymised aggregate data (RSVP counts preserved as-is since RSVPs are deleted but the counts were already computed and stored on events aren't — actually, RSVP rows for the user are deleted, but historical event attendance counts are aggregate).

**Rationale**: FR-07 specifies "hard-delete PII, retain anonymised aggregates. Messages replaced with '[deleted]' and author set to 'Deleted User'. Reactions on deleted user's messages are removed."

**Deletion sequence** (within a transaction):
1. Anonymise messages: `UPDATE messages SET content = '[deleted]', author_id = $deletedUserSentinel, is_deleted = true WHERE author_id = $userId`
2. Delete reactions on user's messages: `DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE author_id = $deletedUserSentinel AND ...)`  — actually, once author_id is updated in step 1, we need to handle this differently. Better: before step 1, delete reactions on messages authored by user, then anonymise.
3. Delete reactions BY the user: `DELETE FROM reactions WHERE user_id = $userId`
4. Delete follows: `DELETE FROM follows WHERE follower_id = $userId OR followee_id = $userId`
5. Delete blocks/mutes: `DELETE FROM blocks WHERE blocker_id = $userId OR blocked_id = $userId`; same for mutes
6. Delete social links: `DELETE FROM social_links WHERE user_id = $userId`
7. Delete RSVPs: Update to anonymised or delete. Spec says "anonymised aggregate data (RSVP counts, etc.) retained" — delete the RSVP rows but counts were already reflected in event's `confirmedCount` at query time. Since RSVP count is a live COUNT query, deleting RSVPs would decrease the count. Solution: mark RSVPs as `user_id = $deletedUserSentinel` instead of deleting, so COUNT is preserved.
8. Delete user profile PII: `UPDATE users SET display_name = 'Deleted User', email = NULL, bio = NULL, avatar_url = NULL, home_city_id = NULL`
9. Delete data exports: `DELETE FROM data_exports WHERE user_id = $userId`
10. Delete pending reports by user: `UPDATE reports SET reporter_id = $deletedUserSentinel WHERE reporter_id = $userId`

**Sentinel user**: A well-known UUID (`00000000-0000-0000-0000-000000000000`) representing "Deleted User." This row exists in the users table with `display_name = 'Deleted User'` and no PII. All anonymised references point here.

**Alternatives considered**:
- **Cascading hard delete of everything**: Simpler but violates "retain anonymised aggregates" and "preserves thread continuity" (FR-07). Deleting messages would leave gaps in discussion threads.
- **Soft delete with PII nullification**: Same result as our approach but keeps rows in every table. Our approach is a hybrid: PII tables are cleaned, relationship tables use sentinel, messages are anonymised in place.
- **Deferred deletion (30-day grace period)**: Not required by spec. Immediate deletion on confirmation. The GDPR "right to erasure" (Article 17) allows up to 30 days, but the spec says "When I confirm the deletion, Then all my PII is permanently removed."

---

## R-9: Message Reactions — Predefined Emoji Set

**Decision**: A `reactions` table with `(message_id, user_id, emoji)` where `emoji` is a string from a predefined set validated at the API layer (Zod enum). One reaction per type per user per message (unique constraint). No custom emoji in v1.

**Rationale**: FR-14 specifies "predefined emoji set (e.g., thumbs up, heart, fire, laugh). One reaction per type per user per message." A simple table with a unique constraint is the most straightforward implementation.

**Predefined emoji set**:
- `thumbs_up` (👍)
- `heart` (❤️)
- `fire` (🔥)
- `laugh` (😂)
- `clap` (👏)
- `thinking` (🤔)

Stored as string keys (not unicode characters) for portability. The frontend maps keys to emoji display.

**Alternatives considered**:
- **JSONB array on message row**: `reactions: { emoji: string, userIds: string[] }[]`. Avoids a separate table but makes the unique constraint harder (application-level enforcement). Also problematic for deletion (remove one user's reaction = partial JSON update). Separate table is simpler.
- **Arbitrary emoji (user picks any unicode)**: The spec says "predefined set." Restricting to a known set avoids moderation issues and keeps the UI consistent.
- **Reaction counts only (no user tracking)**: Can't enforce "one per type per user" without tracking who reacted. Also, the user needs to see which reactions they've already placed.

---

## R-10: Thread Moderation — Admin Capabilities

**Decision**: Scoped admins (city/country/global scope covering the event's city) can: delete any message (hard delete replaces content with `[deleted by admin]`), pin/unpin messages (max 3 pinned per thread, enforced at service layer), and lock/unlock threads (boolean `is_locked` on thread). Thread lock prevents new messages from non-admins. Edit capability is author-only (admins cannot edit others' messages — only delete).

**Rationale**: FR-13 specifies "Admins at event scope can delete any message, lock/unlock threads, and pin messages (max 3 pinned per thread)." The admin scope check reuses Spec 004's `withPermission()` middleware with the event's city as the scope.

**Pin enforcement**:
```typescript
const pinnedCount = await db.query(
  'SELECT COUNT(*) FROM messages WHERE thread_id = $1 AND is_pinned = true',
  [threadId]
);
if (pinnedCount >= 3) throw new ApiError(422, 'Maximum 3 pinned messages per thread');
```

**Alternatives considered**:
- **Soft delete for admin deletions**: The spec says messages are "replaced" — implying the row persists with modified content. This preserves thread ordering and reply context. Using `deleted_by` to distinguish author self-delete from admin delete.
- **Separate pin table**: Over-engineering for a boolean flag + count check. The `is_pinned` column on messages is sufficient.
