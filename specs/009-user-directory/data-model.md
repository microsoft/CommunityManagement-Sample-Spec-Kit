# Data Model: User Directory

**Spec**: 009 | **Date**: 2026-03-19

---

## Overview

The User Directory reuses existing tables entirely and adds **one new column** to `user_profiles`.

**Zero new tables** — the directory is a filtered, joined view over:
- `user_profiles` — display name, bio, home city, default role, avatar, **directory_visible** (new)
- `social_links` — platform links with visibility rules
- `follows` — relationship detection (friend/following/follower/none)
- `blocks` — mutual exclusion from directory results
- `teacher_profiles` — verified teacher badge
- `cities` — home city name for display and proximity sort

---

## Schema Change

### user_profiles — new column

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| directory_visible | boolean | NOT NULL DEFAULT false | Opt-in flag; false means hidden from directory |

**Migration**: `007_user_directory.sql`

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS directory_visible BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_directory
  ON user_profiles (directory_visible) WHERE directory_visible = true;
```

**Rationale**: Default false enforces privacy-first — users must actively opt in.

---

## Directory Query Design

The directory page uses a **single SQL query** (no N+1) with:
- JOINs for city name and teacher badge
- `json_agg()` for social links (aggregated in one pass)
- Left-join relationship detection (follows table, two rows)
- Block check via `NOT EXISTS` subquery
- Cursor-based pagination with composite cursor `(display_name, user_id)`

### Base Query Skeleton

```sql
SELECT
  up.user_id,
  up.display_name,
  up.bio,
  c.name            AS home_city_name,
  up.default_role,
  up.avatar_url,
  up.created_at,
  (tp.badge_status = 'verified') AS is_verified_teacher,
  COALESCE(
    json_agg(
      json_build_object(
        'id',         sl.id,
        'userId',     sl.user_id,
        'platform',   sl.platform,
        'url',        sl.url,
        'visibility', sl.visibility
      ) ORDER BY sl.platform
    ) FILTER (WHERE sl.id IS NOT NULL),
    '[]'::json
  ) AS social_links,
  CASE
    WHEN f_out.followee_id IS NOT NULL AND f_in.follower_id IS NOT NULL THEN 'friend'
    WHEN f_out.followee_id IS NOT NULL THEN 'following'
    WHEN f_in.follower_id IS NOT NULL  THEN 'follower'
    ELSE 'none'
  END AS relationship
FROM user_profiles up
LEFT JOIN cities c
       ON c.id = up.home_city_id
LEFT JOIN teacher_profiles tp
       ON tp.user_id = up.user_id
      AND tp.is_deleted = false
      AND tp.badge_status = 'verified'
LEFT JOIN social_links sl
       ON sl.user_id = up.user_id
LEFT JOIN follows f_out
       ON f_out.follower_id = $viewerId
      AND f_out.followee_id = up.user_id
LEFT JOIN follows f_in
       ON f_in.follower_id = up.user_id
      AND f_in.followee_id = $viewerId
WHERE up.directory_visible = true
  AND up.user_id != $viewerId
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    WHERE (b.blocker_id = $viewerId AND b.blocked_id = up.user_id)
       OR (b.blocker_id = up.user_id AND b.blocked_id = $viewerId)
  )
  -- + optional filter predicates
  -- + cursor predicate
GROUP BY
  up.user_id, up.display_name, up.bio,
  c.name, up.default_role, up.avatar_url, up.created_at,
  tp.badge_status,
  f_out.followee_id, f_in.follower_id
ORDER BY
  up.display_name ASC NULLS LAST,
  up.user_id ASC
LIMIT $limit
```

---

## Cursor-Based Pagination

Composite cursor encodes `(displayName, userId)` as a base64 JSON string.

- **Stable ordering**: `display_name ASC NULLS LAST, user_id ASC`
- **Cursor predicate**: `(up.display_name, up.user_id) > ($cursorName, $cursorId)` (with NULL handling)
- **Encoding**: `btoa(JSON.stringify({ n: displayName, id: userId }))`

---

## Profile Completeness Score (US7)

Computed server-side from the fields available in the query:

| Field present | Points |
|---------------|--------|
| display_name set | 20 |
| bio set | 20 |
| avatar_url set | 20 |
| home_city_id set | 20 |
| default_role set | 10 |
| ≥ 1 social link | 10 |
| **Total** | **100** |

---

## Dependencies

| Spec | Table(s) used |
|------|---------------|
| Spec 002 | user_profiles, social_links, follows, blocks |
| Spec 004 | users (auth) |
| Spec 005 | teacher_profiles (badge check) |
