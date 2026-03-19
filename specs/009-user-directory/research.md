# Research: User Directory

**Spec**: 009 | **Date**: 2026-03-19

---

## Prior Art in This Codebase

### Teacher Directory (Spec 005)

The closest analog is the teacher directory (`GET /api/teachers`), implemented in `src/lib/teachers/profiles.ts`.

**Similarities**:
- ILIKE text search on name/bio
- Specialty/badge filters
- Pagination (offset-based in teachers, cursor-based in spec 009)

**Differences**:
- User directory uses cursor pagination (more appropriate for real-time data)
- User directory aggregates social links via `json_agg()` to avoid N+1
- User directory adds relationship detection (follows table joins)
- User directory adds block enforcement
- User directory requires opt-in (`directory_visible` flag)

### Profile Service (Spec 002)

`getProfile()` in `src/lib/profiles/service.ts` shows the relationship detection and social link filtering pattern:
- `getRelationship()` — follows table double-lookup
- `filterSocialLinks()` — visibility-aware link filtering

For the directory we inline relationship detection into the main SQL query (two LEFT JOINs) to avoid per-row async calls.

---

## Cursor Pagination Design

Cursor encodes `(displayName, userId)` as base64-encoded JSON:

```
cursor = btoa(JSON.stringify({ n: row.displayName, id: row.userId }))
```

Pagination predicate (handles NULL display_name):
```sql
(
  (up.display_name > $cursorName)
  OR (up.display_name = $cursorName AND up.user_id > $cursorId)
  OR (up.display_name IS NULL AND $cursorName IS NULL AND up.user_id > $cursorId)
  OR (up.display_name IS NULL AND $cursorName IS NOT NULL)
)
```

This is simpler than `OFFSET` and doesn't drift when rows are inserted between pages.

---

## Block Enforcement

The `NOT EXISTS` subquery checks both directions of the block relationship:
```sql
NOT EXISTS (
  SELECT 1 FROM blocks b
  WHERE (b.blocker_id = $viewerId AND b.blocked_id = up.user_id)
     OR (b.blocker_id = up.user_id AND b.blocked_id = $viewerId)
)
```

This ensures blocked users don't appear in each other's directory views.

---

## Proximity Sort (US8)

Since `cities` has `latitude` and `longitude`, proximity sort is implemented as:
1. Same city as viewer (exact `home_city_id` match) — sort group 1
2. Same country (JOIN on `cities.country_id`) — sort group 2
3. Everything else — sort group 3

This avoids expensive Haversine calculations at query time while still giving useful local-first ordering.
