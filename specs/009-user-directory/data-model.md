# Data Model: User Directory

**Spec**: 009 | **Date**: 2026-03-19

---

## Entity Relationship Overview

```
                          ┌────────────────┐
                          │   geography    │
                          │  (from 004)    │
                          └───────┬────────┘
                                  │ N:1
┌─────────────┐       ┌──────────┴────────┐       ┌─────────────────┐
│    users     │──1:1──│  user_profiles    │──1:N──│  social_links   │
│  (from 004)  │       │  + directory_     │       │  + expanded     │
│              │       │    visible (NEW)  │       │    platform     │
│              │       └───────────────────┘       │    enum (MOD)   │
│              │              │                    └─────────────────┘
│              │              │ LEFT JOIN
│              │       ┌──────┴──────────┐
│              │       │ teacher_profiles │
│              │       │   (from 005)    │
│              │       └─────────────────┘
│              │
│              │──1:N──┌───────────────┐
│              │       │    follows     │──N:1── users
│              │       │  (from 002)   │
│              │       └───────────────┘
│              │
│              │──1:N──┌───────────────┐
│              │       │    blocks      │──N:1── users
│              │       │  (from 002)   │
│              │       └───────────────┘
│              │
│              │──1:N──┌───────────────┐
│              │       │    mutes       │
│              │       │  (from 002)   │
└─────────────┘       └───────────────┘
```

**Key**: This spec introduces **zero new tables**. It adds one column to `user_profiles` and expands the CHECK constraint on `social_links.platform`. All other tables are consumed as-is.

**Dependencies on other specs**:
- **Spec 002**: `user_profiles` (extended), `social_links` (constraint modified), `follows`, `blocks`, `mutes`
- **Spec 004**: `users` (auth FK), `geography` (city/country/continent hierarchy)
- **Spec 005**: `teacher_profiles` (`badge_status` for verified teacher badge/filter)

---

## Schema Changes

### 1. ALTER: user_profiles — Add `directory_visible`

Add a single column to the existing `user_profiles` table (defined in Spec 002).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| directory_visible | boolean | NOT NULL, DEFAULT false | Opt-in directory visibility (FR-013, FR-014) |

**Migration SQL**:

```sql
-- 009_user_directory.sql

-- 1. Add directory_visible column with privacy-first default
ALTER TABLE user_profiles
  ADD COLUMN directory_visible BOOLEAN NOT NULL DEFAULT false;

-- 2. Expand social_links platform enum from 4 → 8 values
ALTER TABLE social_links DROP CONSTRAINT IF EXISTS social_links_platform_check;
ALTER TABLE social_links ADD CONSTRAINT social_links_platform_check
  CHECK (platform IN (
    'facebook', 'instagram', 'youtube', 'website',
    'tiktok', 'twitter_x', 'linkedin', 'threads'
  ));

-- 3. New indexes for directory queries
-- Partial index: only directory-visible profiles matter for listing
CREATE INDEX idx_profiles_directory_visible
  ON user_profiles (id)
  WHERE directory_visible = true;

-- Composite index for role filtering + visibility
CREATE INDEX idx_profiles_role_visible
  ON user_profiles (default_role, id)
  WHERE directory_visible = true;

-- Index for text search on display name (case-insensitive)
CREATE INDEX idx_profiles_name_visible
  ON user_profiles (lower(display_name) text_pattern_ops, id)
  WHERE directory_visible = true;

-- Index for "recently joined" sort
CREATE INDEX idx_profiles_created_visible
  ON user_profiles (created_at DESC, id DESC)
  WHERE directory_visible = true;

-- Index for home city filtering (supports proximity sort via geography JOIN)
CREATE INDEX idx_profiles_city_visible
  ON user_profiles (home_city_id, id)
  WHERE directory_visible = true AND home_city_id IS NOT NULL;
```

**Rollback SQL**:

```sql
-- Rollback 009_user_directory.sql
DROP INDEX IF EXISTS idx_profiles_city_visible;
DROP INDEX IF EXISTS idx_profiles_created_visible;
DROP INDEX IF EXISTS idx_profiles_name_visible;
DROP INDEX IF EXISTS idx_profiles_role_visible;
DROP INDEX IF EXISTS idx_profiles_directory_visible;

ALTER TABLE social_links DROP CONSTRAINT IF EXISTS social_links_platform_check;
ALTER TABLE social_links ADD CONSTRAINT social_links_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'youtube', 'website'));

ALTER TABLE user_profiles DROP COLUMN IF EXISTS directory_visible;
```

---

### 2. MODIFY: social_links — Expand platform CHECK constraint

No structural change — only the CHECK constraint is widened.

**Before** (Spec 002):

```sql
CHECK (platform IN ('facebook', 'instagram', 'youtube', 'website'))
```

**After** (Spec 009):

```sql
CHECK (platform IN (
  'facebook', 'instagram', 'youtube', 'website',
  'tiktok', 'twitter_x', 'linkedin', 'threads'
))
```

This is included in the migration above. Existing rows are unaffected (they already satisfy the new constraint).

---

## Existing Tables Consumed (No Changes)

### follows (Spec 002)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| follower_id | uuid | FK → users(id) |
| followee_id | uuid | FK → users(id) |
| created_at | timestamptz | |

**Used for**: Relationship status display (Following / Follows Me / Friend / None), relationship filters (friends = mutual follows), social link visibility (`followers`, `friends` visibility levels).

**Existing indexes suffice**: `idx_follows_follower (follower_id)`, `idx_follows_followee (followee_id)`, `UNIQUE idx_follows_pair (follower_id, followee_id)`.

### blocks (Spec 002)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| blocker_id | uuid | FK → users(id) |
| blocked_id | uuid | FK → users(id) |
| created_at | timestamptz | |

**Used for**: Symmetric directory exclusion (FR-016). If A blocks B, neither sees the other.

**Existing indexes suffice**: `UNIQUE idx_blocks_pair (blocker_id, blocked_id)`.

### mutes (Spec 002)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| muter_id | uuid | FK → users(id) |
| muted_id | uuid | FK → users(id) |
| created_at | timestamptz | |

**Used for**: NOT used for directory filtering (FR-017: muted users still appear). Included here for completeness — the directory explicitly does NOT filter mutes.

### geography (Spec 004)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| city | varchar(255) | Canonical key |
| country | varchar(255) | |
| continent | varchar(100) | |
| display_name_city | varchar(255) | Human-readable |
| display_name_country | varchar(255) | |
| display_name_continent | varchar(255) | |

**Used for**: Location filtering (city, country, continent), proximity sort tiers (same city → same country → same continent → global), display names on directory cards.

**Existing indexes suffice**: `idx_geography_city`, `idx_geography_country`, `idx_geography_continent`.

### teacher_profiles (Spec 005)

| Column | Type | Notes (relevant subset) |
|--------|------|------------------------|
| id | uuid | PK |
| user_id | uuid | FK → users(id), UNIQUE |
| badge_status | varchar(20) | `pending`, `verified`, `expired`, `revoked` |
| is_deleted | boolean | Soft-delete flag |

**Used for**: Verified teacher badge on directory cards (`badge_status = 'verified'`), "verified teachers only" filter (FR-008). LEFT JOIN — most users won't have a teacher profile.

**Existing indexes suffice**: `UNIQUE idx_teacher_user (user_id)`, `idx_teacher_badge (badge_status) WHERE is_deleted = false`.

---

## Directory Query: Core SQL Pattern

The directory service builds this query dynamically based on active filters and sort mode. See research.md R-4 for the full rationale.

```sql
SELECT
  p.id,
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.default_role,
  p.created_at,
  p.directory_visible,
  -- Geography
  g.display_name_city   AS home_city,
  g.display_name_country AS home_country,
  g.display_name_continent AS home_continent,
  g.city    AS city_key,
  g.country AS country_key,
  g.continent AS continent_key,
  -- Teacher badge
  (tp.badge_status = 'verified' AND tp.is_deleted = false) AS is_verified_teacher,
  -- Social links (filtered by visibility for this viewer)
  COALESCE(
    json_agg(
      json_build_object('platform', sl.platform, 'url', sl.url)
    ) FILTER (WHERE sl.id IS NOT NULL AND (
      sl.visibility = 'everyone'
      OR (sl.visibility = 'followers' AND EXISTS (
        SELECT 1 FROM follows WHERE follower_id = $viewerId AND followee_id = p.user_id
      ))
      OR (sl.visibility = 'friends' AND EXISTS (
        SELECT 1 FROM follows f1
        JOIN follows f2 ON f1.followee_id = f2.follower_id AND f1.follower_id = f2.followee_id
        WHERE f1.follower_id = $viewerId AND f1.followee_id = p.user_id
      ))
    )),
    '[]'::json
  ) AS visible_social_links,
  -- Relationship indicators
  EXISTS(SELECT 1 FROM follows WHERE follower_id = $viewerId AND followee_id = p.user_id) AS viewer_follows,
  EXISTS(SELECT 1 FROM follows WHERE follower_id = p.user_id AND followee_id = $viewerId) AS follows_viewer,
  -- Proximity tier (only when sort = 'proximity')
  CASE
    WHEN g.city = $viewerCity           THEN 1
    WHEN g.country = $viewerCountry     THEN 2
    WHEN g.continent = $viewerContinent THEN 3
    ELSE 4
  END AS proximity_tier
FROM user_profiles p
LEFT JOIN geography g ON g.id = p.home_city_id
LEFT JOIN teacher_profiles tp ON tp.user_id = p.user_id AND tp.is_deleted = false
LEFT JOIN social_links sl ON sl.user_id = p.user_id
WHERE p.directory_visible = true
  -- Block exclusion (symmetric)
  AND NOT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = $viewerId AND blocked_id = p.user_id)
       OR (blocker_id = p.user_id AND blocked_id = $viewerId)
  )
  -- Exclude self
  AND p.user_id != $viewerId
  -- Dynamic filters (appended conditionally):
  -- AND p.default_role = $roleFilter
  -- AND g.city = $cityFilter / g.country = $countryFilter / g.continent = $continentFilter
  -- AND tp.badge_status = 'verified' AND tp.is_deleted = false  (teacher filter)
  -- AND lower(p.display_name) LIKE lower($search) || '%'  (text search)
  -- AND <relationship subquery>  (friends/following/followers/blocked filter)
  -- Cursor: AND (sort_col, p.id) > ($cursorVal, $cursorId)
GROUP BY p.id, g.id, tp.id
ORDER BY <sort_expression>, p.id
LIMIT $pageSize + 1;
```

**Note**: The `LIMIT + 1` pattern detects whether a next page exists without a separate COUNT query.

---

## GDPR Impact

### Data Export
The `directory_visible` preference MUST be included in the GDPR data export (FR-031). Update `apps/web/src/lib/gdpr/export.ts` to include `directory_visible` in the user profile section.

### Account Deletion
On account deletion, `directory_visible` is cleared as part of the existing `user_profiles` deletion/anonymisation (FR-032). No additional deletion logic needed — if the profile row is deleted or anonymised, the user automatically vanishes from directory results.

---

## Index Summary

| Index | Table | Columns | Condition | Purpose |
|-------|-------|---------|-----------|---------|
| `idx_profiles_directory_visible` | user_profiles | `(id)` | `WHERE directory_visible = true` | Fast base filter for all directory queries |
| `idx_profiles_role_visible` | user_profiles | `(default_role, id)` | `WHERE directory_visible = true` | Role filter |
| `idx_profiles_name_visible` | user_profiles | `(lower(display_name) text_pattern_ops, id)` | `WHERE directory_visible = true` | Text search (prefix matching) |
| `idx_profiles_created_visible` | user_profiles | `(created_at DESC, id DESC)` | `WHERE directory_visible = true` | "Recently joined" sort |
| `idx_profiles_city_visible` | user_profiles | `(home_city_id, id)` | `WHERE directory_visible = true AND home_city_id IS NOT NULL` | Location filter + proximity sort |

All other required indexes exist from Specs 002, 004, and 005.

---

## Validation Rules (Zod Schemas)

### Directory Query Params

```typescript
const DirectoryQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['alphabetical', 'recent', 'proximity']).default('alphabetical'),
  role: z.enum(['base', 'flyer', 'hybrid']).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  continent: z.string().optional(),
  teachersOnly: z.coerce.boolean().optional(),
  relationship: z.enum(['friends', 'following', 'followers', 'blocked']).optional(),
  search: z.string().max(100).optional(),
});
```

### Directory Visible Toggle

```typescript
const DirectoryVisibleSchema = z.object({
  directoryVisible: z.boolean(),
});
```

Validated at the `PATCH /api/profiles/me` boundary (extends existing profile update schema).
