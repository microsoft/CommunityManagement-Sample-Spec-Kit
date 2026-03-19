# Data Model: Community & Social Features

**Spec**: 002 | **Date**: 2026-03-15

---

## Entity Relationship Overview

```
┌─────────────┐       ┌───────────────┐       ┌───────────┐
│    users     │──1:1──│ user_profiles  │──N:1──│  cities   │
│  (from 004)  │       └───────────────┘       │ (from 001)│
│              │                               └───────────┘
│              │──1:N──┌───────────────┐
│              │       │ social_links   │
│              │       └───────────────┘
│              │
│              │──1:N──┌───────────────┐
│              │       │   follows      │──N:1── users
│              │       └───────────────┘
│              │
│              │──1:N──┌───────────────┐       ┌───────────┐
│              │       │   messages     │──N:1──│  threads   │
│              │       └───────────────┘       └───────────┘
│              │              │                      │
│              │              └──1:N──┌────────────┐ │
│              │                     │ reactions   │ │──entity_type/entity_id
│              │                     └────────────┘ │  → events (from 001)
│              │
│              │──1:N──┌───────────────┐
│              │       │    blocks      │──N:1── users
│              │       └───────────────┘
│              │
│              │──1:N──┌───────────────┐
│              │       │    mutes       │──N:1── users
│              │       └───────────────┘
│              │
│              │──1:N──┌───────────────┐
│              │       │   reports      │
│              │       └───────────────┘
│              │
│              │──1:N──┌───────────────┐
│              │       │ data_exports   │
└─────────────┘       └───────────────┘
```

**Dependencies on other specs**:
- **Spec 004**: `users` table, `permission_grants` (for admin moderation scope checks), `withPermission()` middleware
- **Spec 001**: `cities` table (home city FK), `events` table (thread entity reference), `rsvps` table (thread write-access check)

---

## Entities

### 1. user_profiles

User profile data. Separated from the auth `users` table to keep auth concerns isolated.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, UNIQUE, FK → users(id) | One profile per user |
| display_name | varchar(100) | NOT NULL | |
| bio | text | NULL | Max 500 characters (app-level) |
| home_city_id | uuid | NULL, FK → cities(id) | From Spec 001's city registry. NULL until set. |
| default_role | varchar(20) | NOT NULL, DEFAULT 'hybrid' | CHECK (default_role IN ('base', 'flyer', 'hybrid')) |
| avatar_url | varchar(2048) | NULL | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_profiles_user` on `(user_id)`
- `idx_profiles_home_city` on `(home_city_id)` — for city-based user queries
- `idx_profiles_display_name` on `(display_name)` — for search

**Validation rules**:
- `display_name` max 100 characters, min 1 character, trimmed
- `bio` max 500 characters
- `home_city_id` must reference an existing city in Spec 001's cities table
- `default_role` must be one of: `base`, `flyer`, `hybrid`
- `avatar_url` must be a valid URL if provided

**Check constraints**:
```sql
CHECK (default_role IN ('base', 'flyer', 'hybrid'))
CHECK (char_length(display_name) >= 1)
```

---

### 2. social_links

Per-platform social links with visibility controls.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| platform | varchar(20) | NOT NULL | CHECK (platform IN ('facebook', 'instagram', 'youtube', 'website')) |
| url | varchar(2048) | NOT NULL | Platform URL or handle |
| visibility | varchar(20) | NOT NULL, DEFAULT 'everyone' | CHECK (visibility IN ('everyone', 'followers', 'friends', 'hidden')) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_social_links_user_platform` on `(user_id, platform)` — one link per platform per user
- `idx_social_links_user` on `(user_id)` — fetch all links for a user

**Validation rules**:
- One row per `(user_id, platform)` — enforced by unique index
- `url` must be a valid URL
- `platform` restricted to the defined enum set (extensible by adding to CHECK constraint)

**Check constraints**:
```sql
CHECK (platform IN ('facebook', 'instagram', 'youtube', 'website'))
CHECK (visibility IN ('everyone', 'followers', 'friends', 'hidden'))
```

---

### 3. follows

Unidirectional follow relationships. Mutual follows = friends (derived, not stored).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| follower_id | uuid | NOT NULL, FK → users(id) | The user who follows |
| followee_id | uuid | NOT NULL, FK → users(id) | The user being followed |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_follows_pair` on `(follower_id, followee_id)` — one follow per direction per pair
- `idx_follows_follower` on `(follower_id)` — "who do I follow" query
- `idx_follows_followee` on `(followee_id)` — "who follows me" / follower count query

**Validation rules**:
- `follower_id != followee_id` — cannot follow yourself
- Before INSERT: check no active block exists between the pair (application logic)

**Check constraints**:
```sql
CHECK (follower_id != followee_id)
```

**Derived queries**:
```sql
-- Friends (mutual follows): used for visibility and profile display
SELECT f1.followee_id AS friend_id
FROM follows f1
INNER JOIN follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
WHERE f1.follower_id = $userId;
```

---

### 4. threads

Discussion threads attached to entities (events, potentially cities in future).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| entity_type | varchar(20) | NOT NULL | CHECK (entity_type IN ('event')) — extensible |
| entity_id | uuid | NOT NULL | FK resolved at application layer (polymorphic) |
| is_locked | boolean | NOT NULL, DEFAULT false | Locked threads: only admins can post |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_threads_entity` on `(entity_type, entity_id)` — one thread per entity
- `idx_threads_entity_type` on `(entity_type)` — filter threads by type

**Validation rules**:
- One thread per `(entity_type, entity_id)` — enforced by unique index
- `entity_id` must reference a valid entity of the given type (application logic — no DB FK due to polymorphism)
- Thread is auto-created when an event is created (or lazily on first message)

**Note on polymorphic FK**: The `entity_id` is not a DB-level FK because it can point to different tables depending on `entity_type`. Referential integrity is maintained at the application layer. This is the standard polymorphic association pattern — simpler than separate junction tables per entity type.

---

### 5. messages

Messages within threads. Supports edit history, soft-delete, and pinning.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| thread_id | uuid | NOT NULL, FK → threads(id) | |
| author_id | uuid | NOT NULL, FK → users(id) | Set to sentinel UUID on account deletion |
| content | text | NOT NULL | Max 2000 characters (app-level). Set to "[deleted]" or "[deleted by admin]" on delete |
| edit_history | jsonb | NOT NULL, DEFAULT '[]' | Array of `{ content: string, editedAt: string }` |
| is_pinned | boolean | NOT NULL, DEFAULT false | |
| pinned_by | uuid | NULL, FK → users(id) | Admin who pinned |
| is_deleted | boolean | NOT NULL, DEFAULT false | Soft delete — content replaced |
| deleted_by | uuid | NULL, FK → users(id) | Author or admin who deleted |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| edited_at | timestamptz | NULL | Last edit timestamp |

**Indexes**:
- `idx_messages_thread_created` on `(thread_id, created_at ASC)` — message listing (chronological)
- `idx_messages_thread_pinned` on `(thread_id) WHERE is_pinned = true` — pinned messages query
- `idx_messages_author` on `(author_id)` — for GDPR export, account deletion

**Validation rules**:
- `content` max 2000 characters (FR-12)
- No file/image attachments in v1 (FR-12)
- Edit: previous content pushed to `edit_history` JSON array before update
- Delete by author: `content = '[deleted]'`, `is_deleted = true`, `deleted_by = author_id`
- Delete by admin: `content = '[deleted by admin]'`, `is_deleted = true`, `deleted_by = admin_id`
- Pin: max 3 pinned messages per thread (application logic)
- Author can edit/delete their own messages with no time limit (FR-12)

**Edit history JSON schema**:
```json
[
  { "content": "original message text", "editedAt": "2026-03-15T10:30:00Z" },
  { "content": "first edit text", "editedAt": "2026-03-15T11:00:00Z" }
]
```

---

### 6. reactions

Message reactions from predefined emoji set.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| message_id | uuid | NOT NULL, FK → messages(id) | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| emoji | varchar(20) | NOT NULL | CHECK (emoji IN ('thumbs_up', 'heart', 'fire', 'laugh', 'clap', 'thinking')) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_reactions_unique` on `(message_id, user_id, emoji)` — one reaction per type per user per message
- `idx_reactions_message` on `(message_id)` — fetch reactions for a message

**Validation rules**:
- One reaction per `(message_id, user_id, emoji)` — enforced by unique index
- `emoji` must be from the predefined set (FR-14)
- Toggle behaviour: if reaction exists, DELETE; if not, INSERT

**Check constraints**:
```sql
CHECK (emoji IN ('thumbs_up', 'heart', 'fire', 'laugh', 'clap', 'thinking'))
```

---

### 7. blocks

Block relationships. Symmetric enforcement (both users hidden from each other).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| blocker_id | uuid | NOT NULL, FK → users(id) | User who initiated the block |
| blocked_id | uuid | NOT NULL, FK → users(id) | User being blocked |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_blocks_pair` on `(blocker_id, blocked_id)` — one block per direction
- `idx_blocks_blocker` on `(blocker_id)` — "who have I blocked"
- `idx_blocks_blocked` on `(blocked_id)` — "who blocked me" (for enforcement checks)
- `idx_blocks_both` on `(blocker_id, blocked_id)` and `(blocked_id, blocker_id)` — symmetric lookup

**Validation rules**:
- `blocker_id != blocked_id` — cannot block yourself
- On INSERT: DELETE from follows WHERE (follower=A AND followee=B) OR (follower=B AND followee=A) — sever all follow/friend relationships

**Check constraints**:
```sql
CHECK (blocker_id != blocked_id)
```

**Side effects on block creation** (application logic):
1. Remove follows in both directions
2. Block is silent — no notification to blocked user

---

### 8. mutes

Mute relationships. Unilateral — only affects muter's view.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| muter_id | uuid | NOT NULL, FK → users(id) | User who initiated the mute |
| muted_id | uuid | NOT NULL, FK → users(id) | User being muted |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_mutes_pair` on `(muter_id, muted_id)` — one mute per direction
- `idx_mutes_muter` on `(muter_id)` — load mute list for message filtering

**Validation rules**:
- `muter_id != muted_id` — cannot mute yourself
- No impact on follows or friend status (FR-10)
- Silent — no notification

**Check constraints**:
```sql
CHECK (muter_id != muted_id)
```

---

### 9. reports

User reports for admin moderation.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| reporter_id | uuid | NOT NULL, FK → users(id) | Set to sentinel on account deletion |
| reported_user_id | uuid | NOT NULL, FK → users(id) | The user being reported |
| reported_message_id | uuid | NULL, FK → messages(id) | If report is on a specific message |
| reason | varchar(20) | NOT NULL | CHECK (reason IN ('harassment', 'spam', 'inappropriate', 'other')) |
| details | text | NULL | Optional free-text details (max 1000 chars) |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')) |
| reviewed_by | uuid | NULL, FK → users(id) | Admin who reviewed |
| review_notes | text | NULL | Admin's review notes |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| reviewed_at | timestamptz | NULL | |

**Indexes**:
- `idx_reports_status` on `(status) WHERE status = 'pending'` — admin queue: pending reports
- `idx_reports_reported_user` on `(reported_user_id)` — reports against a user
- `idx_reports_reporter` on `(reporter_id)` — reports by a user (for abuse detection)

**Validation rules**:
- `reason` must be from the enum set
- `details` max 1000 characters
- `reported_user_id != reporter_id` — cannot report yourself
- Rate limit: max 10 reports per user per 24h (application logic)

**Check constraints**:
```sql
CHECK (reason IN ('harassment', 'spam', 'inappropriate', 'other'))
CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed'))
CHECK (reporter_id != reported_user_id)
```

**State transitions**:
```
pending → reviewed   (admin opens report)
pending → actioned   (admin takes action — e.g., warning, ban)
pending → dismissed  (admin dismisses as unfounded)
reviewed → actioned
reviewed → dismissed
```

**Scope routing**: When admin queries pending reports, filter by their permission scope:
```sql
-- Admin with city scope for "bristol"
SELECT r.* FROM reports r
JOIN user_profiles up ON r.reported_user_id = up.user_id
JOIN cities c ON up.home_city_id = c.id
WHERE r.status = 'pending'
  AND c.slug = 'bristol';
```
Country/Global admins see wider scope via JOIN through cities → countries → geography hierarchy from Spec 004.

---

### 10. data_exports

Tracks GDPR data export requests and their status.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | CHECK (status IN ('pending', 'processing', 'ready', 'expired', 'failed')) |
| download_url | text | NULL | Signed URL or token-based download path |
| file_size_bytes | integer | NULL | Size of generated export file |
| expires_at | timestamptz | NULL | Download link expiry (7 days from generation) |
| error_message | text | NULL | Error details if status = 'failed' |
| requested_at | timestamptz | NOT NULL, DEFAULT now() | |
| completed_at | timestamptz | NULL | |

**Indexes**:
- `idx_exports_user` on `(user_id)` — user's export history
- `idx_exports_status` on `(status) WHERE status IN ('pending', 'processing')` — job queue

**Validation rules**:
- One active (pending/processing) export per user at a time (application logic)
- `expires_at` set to `completed_at + interval '7 days'` when status transitions to `ready`
- Cleanup job: exports with `expires_at < now()` are transitioned to `expired` and file is deleted

**Check constraints**:
```sql
CHECK (status IN ('pending', 'processing', 'ready', 'expired', 'failed'))
```

**State transitions**:
```
pending → processing  (job picks up the request)
processing → ready    (export file generated successfully)
processing → failed   (error during generation)
ready → expired       (download link expired after 7 days)
```

---

## Sentinel User for Account Deletion

A well-known sentinel user row exists in the `users` table for anonymisation:

```sql
INSERT INTO users (id, email, display_name)
VALUES ('00000000-0000-0000-0000-000000000000', null, 'Deleted User')
ON CONFLICT DO NOTHING;
```

This sentinel is referenced by:
- `messages.author_id` after account deletion (content → "[deleted]")
- `reports.reporter_id` after account deletion
- `rsvps.user_id` after account deletion (preserves aggregate counts)

---

## Migration SQL

```sql
-- Migration: 002_community_social
-- Depends on: 004_permissions (users table), 001_events (cities, events tables)

-- 1. User profiles
CREATE TABLE user_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL UNIQUE REFERENCES users(id),
    display_name    varchar(100) NOT NULL,
    bio             text,
    home_city_id    uuid REFERENCES cities(id),
    default_role    varchar(20) NOT NULL DEFAULT 'hybrid'
                    CHECK (default_role IN ('base', 'flyer', 'hybrid')),
    avatar_url      varchar(2048),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CHECK (char_length(display_name) >= 1)
);

CREATE INDEX idx_profiles_home_city ON user_profiles (home_city_id);
CREATE INDEX idx_profiles_display_name ON user_profiles (display_name);

-- 2. Social links
CREATE TABLE social_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id),
    platform    varchar(20) NOT NULL
                CHECK (platform IN ('facebook', 'instagram', 'youtube', 'website')),
    url         varchar(2048) NOT NULL,
    visibility  varchar(20) NOT NULL DEFAULT 'everyone'
                CHECK (visibility IN ('everyone', 'followers', 'friends', 'hidden')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, platform)
);

CREATE INDEX idx_social_links_user ON social_links (user_id);

-- 3. Follows
CREATE TABLE follows (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id uuid NOT NULL REFERENCES users(id),
    followee_id uuid NOT NULL REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (follower_id, followee_id),
    CHECK (follower_id != followee_id)
);

CREATE INDEX idx_follows_follower ON follows (follower_id);
CREATE INDEX idx_follows_followee ON follows (followee_id);

-- 4. Threads
CREATE TABLE threads (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type varchar(20) NOT NULL CHECK (entity_type IN ('event')),
    entity_id   uuid NOT NULL,
    is_locked   boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id)
);

-- 5. Messages
CREATE TABLE messages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id    uuid NOT NULL REFERENCES threads(id),
    author_id    uuid NOT NULL REFERENCES users(id),
    content      text NOT NULL,
    edit_history jsonb NOT NULL DEFAULT '[]',
    is_pinned    boolean NOT NULL DEFAULT false,
    pinned_by    uuid REFERENCES users(id),
    is_deleted   boolean NOT NULL DEFAULT false,
    deleted_by   uuid REFERENCES users(id),
    created_at   timestamptz NOT NULL DEFAULT now(),
    edited_at    timestamptz
);

CREATE INDEX idx_messages_thread_created ON messages (thread_id, created_at ASC);
CREATE INDEX idx_messages_thread_pinned ON messages (thread_id) WHERE is_pinned = true;
CREATE INDEX idx_messages_author ON messages (author_id);

-- 6. Reactions
CREATE TABLE reactions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id),
    emoji       varchar(20) NOT NULL
                CHECK (emoji IN ('thumbs_up', 'heart', 'fire', 'laugh', 'clap', 'thinking')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON reactions (message_id);

-- 7. Blocks
CREATE TABLE blocks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL REFERENCES users(id),
    blocked_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id);

-- 8. Mutes
CREATE TABLE mutes (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    muter_id uuid NOT NULL REFERENCES users(id),
    muted_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (muter_id, muted_id),
    CHECK (muter_id != muted_id)
);

CREATE INDEX idx_mutes_muter ON mutes (muter_id);

-- 9. Reports
CREATE TABLE reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id         uuid NOT NULL REFERENCES users(id),
    reported_user_id    uuid NOT NULL REFERENCES users(id),
    reported_message_id uuid REFERENCES messages(id),
    reason              varchar(20) NOT NULL
                        CHECK (reason IN ('harassment', 'spam', 'inappropriate', 'other')),
    details             text,
    status              varchar(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    reviewed_by         uuid REFERENCES users(id),
    review_notes        text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    reviewed_at         timestamptz,
    CHECK (reporter_id != reported_user_id)
);

CREATE INDEX idx_reports_status ON reports (status) WHERE status = 'pending';
CREATE INDEX idx_reports_reported_user ON reports (reported_user_id);
CREATE INDEX idx_reports_reporter ON reports (reporter_id);

-- 10. Data exports
CREATE TABLE data_exports (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id),
    status          varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'ready', 'expired', 'failed')),
    download_url    text,
    file_size_bytes integer,
    expires_at      timestamptz,
    error_message   text,
    requested_at    timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz
);

CREATE INDEX idx_exports_user ON data_exports (user_id);
CREATE INDEX idx_exports_status ON data_exports (status) WHERE status IN ('pending', 'processing');

-- 11. Sentinel user for anonymisation
INSERT INTO users (id, display_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Deleted User')
ON CONFLICT DO NOTHING;
```

---

## Cross-Entity Relationships Summary

| From | To | Relationship | Notes |
|------|----|--------------|-------|
| user_profiles | users (004) | 1:1 | user_id FK |
| user_profiles | cities (001) | N:1 | home_city_id FK |
| social_links | users (004) | N:1 | user_id FK |
| follows | users (004) | N:1 × 2 | follower_id, followee_id FKs |
| threads | events (001) | N:1 (polymorphic) | entity_type='event', entity_id = event.id |
| messages | threads | N:1 | thread_id FK |
| messages | users (004) | N:1 | author_id FK |
| reactions | messages | N:1 | message_id FK (CASCADE delete) |
| reactions | users (004) | N:1 | user_id FK |
| blocks | users (004) | N:1 × 2 | blocker_id, blocked_id FKs |
| mutes | users (004) | N:1 × 2 | muter_id, muted_id FKs |
| reports | users (004) | N:1 × 3 | reporter_id, reported_user_id, reviewed_by FKs |
| reports | messages | N:1 (opt) | reported_message_id FK |
| data_exports | users (004) | N:1 | user_id FK |
