# Research: User Directory

**Spec**: 009 | **Date**: 2026-03-19

---

## R-1: Social Platform Enum Expansion Strategy

**Decision**: Use `ALTER TABLE social_links DROP CONSTRAINT ... ADD CONSTRAINT` to expand the CHECK constraint from 4 values (`facebook`, `instagram`, `youtube`, `website`) to 8 values (adding `tiktok`, `twitter_x`, `linkedin`, `threads`). This is a non-destructive migration — existing rows remain valid.

**Rationale**: The `social_links.platform` column uses a `CHECK (platform IN (...))` constraint rather than a PostgreSQL `ENUM` type (confirmed in Spec 002 data model). Expanding a CHECK constraint is a metadata-only operation with no table rewrite:

```sql
ALTER TABLE social_links DROP CONSTRAINT social_links_platform_check;
ALTER TABLE social_links ADD CONSTRAINT social_links_platform_check
  CHECK (platform IN ('facebook','instagram','youtube','website','tiktok','twitter_x','linkedin','threads'));
```

**Alternatives considered**:
- **PostgreSQL ENUM type with `ALTER TYPE ... ADD VALUE`**: Would work if the column used an ENUM, but Spec 002 uses a VARCHAR + CHECK. Converting to ENUM would require a table rewrite for no benefit. Rejected.
- **Remove the CHECK constraint entirely, validate only in Zod**: Violates Principle IV (Server-Side Authority) — defence in depth requires database-level constraints alongside application-level validation. Rejected.
- **Create a new `social_platforms` lookup table with FK**: Over-engineered for a small, static set of 8 values. Would add a JOIN to every social links query. Violates Principle VII (Simplicity). Rejected.

**Zod schema update**: The `SocialPlatform` Zod enum in the validation layer must be updated in sync:

```typescript
const SocialPlatformSchema = z.enum([
  'facebook', 'instagram', 'youtube', 'website',
  'tiktok', 'twitter_x', 'linkedin', 'threads',
]);
```

**TypeScript type update**: The `SocialPlatform` type in `packages/shared/src/types/community.ts` (from Spec 002 contracts) and `specs/002-community-social/contracts/profiles-api.ts` must be extended. The directory contract imports this type.

---

## R-2: Cursor-Based Pagination for Multi-Column Sorts

**Decision**: Use a composite cursor encoding `(sort_value, id)` as a base64-encoded JSON string. The cursor is opaque to the client. The server decodes it to construct `WHERE (sort_col, id) > (cursor_sort_val, cursor_id)` for forward pagination.

**Rationale**: The directory supports three sort modes — alphabetical (display_name), recently joined (created_at DESC), and proximity (computed tier). Each needs a stable cursor that survives concurrent inserts. The `(sort_value, id)` pattern is the standard approach:

- **Alphabetical**: cursor = `{ displayName: "Maria", id: "abc-123" }` → `WHERE (display_name, id) > ('Maria', 'abc-123')`
- **Recently joined**: cursor = `{ createdAt: "2026-01-15T...", id: "abc-123" }` → `WHERE (created_at, id) < ('2026-01-15...', 'abc-123')` (DESC)
- **Proximity**: cursor = `{ tier: 2, displayName: "Maria", id: "abc-123" }` → `WHERE (proximity_tier, display_name, id) > (2, 'Maria', 'abc-123')`

The cursor is base64-encoded to keep it opaque and URL-safe. The server validates the decoded cursor with Zod before use.

**Alternatives considered**:
- **Offset-based pagination (`LIMIT/OFFSET`)**: Constitution mandates cursor-based pagination. Offset is O(n) for deep pages, inconsistent with concurrent writes. Rejected.
- **Keyset on `id` only**: Cannot support multi-column sorts (alphabetical, date, proximity). The cursor must include the sort column value. Rejected.
- **Encrypted cursor (AES)**: Over-engineered. Opaque base64 is sufficient — the cursor carries no sensitive data (display name substring + UUID). Rejected per Principle VII.

**Page size**: Default 20, max 100. Validated by Zod at the API boundary.

---

## R-3: Proximity Sorting via Geography Hierarchy

**Decision**: Use a SQL `CASE` expression that computes a proximity tier (1–4) based on matching geography columns between the viewer's city and each directory member's city. Sort by `(tier ASC, display_name ASC, id ASC)`.

**Rationale**: The geography table (Spec 004) has `city`, `country`, `continent` columns. The `user_profiles.home_city_id` FK points to this table. Proximity tiers:

```sql
CASE
  WHEN g.city = viewer_city           THEN 1  -- Same city
  WHEN g.country = viewer_country     THEN 2  -- Same country
  WHEN g.continent = viewer_continent THEN 3  -- Same continent
  ELSE                                     4  -- Global
END AS proximity_tier
```

Members without a home city (`home_city_id IS NULL`) get tier 4 (global) and sub-sort alphabetically, matching FR-030.

The geography columns are already indexed (Spec 004: `idx_geography_city`, `idx_geography_country`, `idx_geography_continent`). The CASE expression is evaluated per row but the base data comes from the already-joined geography table — no additional lookups.

**Alternatives considered**:
- **Materialized proximity view**: Pre-compute all user-to-user proximity tiers. At 10k users this is 100M rows. Wildly over-engineered. Rejected.
- **PostGIS / distance-based**: Requires latitude/longitude data we don't have. The geography table uses named hierarchies, not coordinates. Would require a new data source. Rejected per Principle VII.
- **Client-side sorting**: Violates Principle IV (Server-Side Authority). The server must own sort order for consistent cursor pagination. Rejected.

**Viewer city resolution**: The API reads the viewer's `home_city_id` from their profile. If the viewer has no home city, proximity sort falls back to alphabetical (tier = 4 for all, sub-sorted by name). This is documented in the spec (FR-030).

---

## R-4: Single-Query Directory with No N+1

**Decision**: Build the directory listing as a single SQL query that JOINs all required data: `user_profiles`, `geography` (location), `teacher_profiles` (badge), `social_links` (aggregated), and relationship subqueries (follow status, block exclusion). Social links are aggregated using `json_agg()` with a filter on visibility.

**Rationale**: Constitution Principle VI mandates no N+1 queries on list endpoints. The directory card needs data from 5+ tables. A single query with JOINs satisfies this:

```sql
SELECT
  p.id, p.display_name, p.avatar_url, p.default_role, p.created_at,
  g.display_name_city, g.display_name_country, g.display_name_continent,
  tp.badge_status = 'verified' AS is_verified_teacher,
  -- Social links aggregated with visibility filter
  COALESCE(
    json_agg(
      json_build_object('platform', sl.platform, 'url', sl.url)
    ) FILTER (WHERE sl.id IS NOT NULL AND <visibility_predicate>),
    '[]'
  ) AS visible_social_links,
  -- Relationship status
  EXISTS(SELECT 1 FROM follows WHERE follower_id = $viewer AND followee_id = p.user_id) AS viewer_follows,
  EXISTS(SELECT 1 FROM follows WHERE follower_id = p.user_id AND followee_id = $viewer) AS follows_viewer
FROM user_profiles p
LEFT JOIN geography g ON g.id = p.home_city_id
LEFT JOIN teacher_profiles tp ON tp.user_id = p.user_id AND tp.is_deleted = false
LEFT JOIN social_links sl ON sl.user_id = p.user_id
WHERE p.directory_visible = true
  AND NOT EXISTS (SELECT 1 FROM blocks WHERE ...)  -- block exclusion
  AND <dynamic_filters>
GROUP BY p.id, g.id, tp.id
ORDER BY <sort_expression>
LIMIT $pageSize + 1  -- +1 to detect hasNextPage
```

The `+1` trick: fetch `pageSize + 1` rows. If we get `pageSize + 1` results, there's a next page. Return only `pageSize` rows to the client and include `hasNextPage: true` + the cursor for the last returned row.

**Social link visibility**: The `<visibility_predicate>` in the `FILTER` clause implements Spec 002's visibility rules:
- `'everyone'` → always visible
- `'followers'` → visible if viewer follows the profile owner
- `'friends'` → visible if mutual follow exists
- `'hidden'` → never visible in directory

This is computed using the same `viewer_follows` and `follows_viewer` subqueries already in the SELECT.

**Alternatives considered**:
- **Fetch profiles first, then batch-load relationships + social links**: Two queries instead of one. Still no N+1, but the single-query approach is simpler and the SQL is not excessively complex with PG's `json_agg`. Rejected (marginal, but single query is cleaner).
- **GraphQL with DataLoader**: Would require a different API architecture. The project uses REST. Rejected.
- **Database view**: A `CREATE VIEW directory_view` could encapsulate the query. However, views cannot accept parameters (viewer_id, filters). Would need to be a function. Over-engineering for a single endpoint. Rejected per Principle VII.

**Performance indexes needed** (detailed in data-model.md):
- `idx_profiles_directory_visible` — partial index `WHERE directory_visible = true`
- `idx_profiles_role_visible` — `(default_role) WHERE directory_visible = true`
- `idx_profiles_name_visible` — `(lower(display_name)) WHERE directory_visible = true`
- `idx_profiles_created_visible` — `(created_at DESC) WHERE directory_visible = true`

---

## R-5: Profile Completeness — Pure Function, Not Stored

**Decision**: Compute profile completeness as a pure TypeScript function at render time. Not stored in the database per FR-027.

**Rationale**: The spec explicitly requires completeness to be computed at render time (FR-027: "NOT stored in the database"). The calculation is trivial:

```typescript
function computeProfileCompleteness(profile: {
  avatarUrl: string | null;
  displayName: string | null;
  bio: string | null;
  homeCityId: string | null;
  socialLinkCount: number;
}): number {
  let score = 0;
  if (profile.avatarUrl) score += 20;
  if (profile.displayName) score += 20;
  if (profile.bio) score += 20;
  if (profile.homeCityId) score += 20;
  if (profile.socialLinkCount > 0) score += 20;
  return score;
}
```

This goes in `apps/web/src/lib/directory/completeness.ts` — a pure function with zero dependencies, easily unit-testable.

**Alternatives considered**:
- **Stored column with trigger**: Violates FR-027. Would also require trigger maintenance on every profile field update. Rejected.
- **Computed column (PostgreSQL GENERATED)**: PostgreSQL `GENERATED ALWAYS AS` doesn't support subqueries (social_link_count requires a different table). Rejected.
- **Materialised view**: Wildly over-engineered for a simple 5-field check. Rejected per Principle VII.

---

## R-6: Block Exclusion — Symmetric Hiding

**Decision**: Use `NOT EXISTS` subqueries to exclude blocked users in both directions. Blocks are symmetric: if A blocks B, neither sees the other in directory results.

**Rationale**: The spec requires symmetric hiding (FR-016, US-4 AS-5/AS-6). The blocks table (Spec 002) stores `(blocker_id, blocked_id)`. Checking both directions:

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM blocks
  WHERE (blocker_id = $viewer AND blocked_id = p.user_id)
     OR (blocker_id = p.user_id AND blocked_id = $viewer)
)
```

This is equivalent to two `NOT EXISTS` subqueries but expressed as one for clarity. The `blocks` table has indexes on `(blocker_id, blocked_id)` from Spec 002.

**Alternatives considered**:
- **Pre-filter with a block list CTE**: `WITH blocked_ids AS (SELECT ...)` then `WHERE p.user_id NOT IN (SELECT ... FROM blocked_ids)`. Marginally more readable but functionally identical. Either approach is fine; `NOT EXISTS` is the canonical PostgreSQL pattern and avoids materialising the block list. Chosen for consistency with Spec 002's existing block enforcement.
- **Application-level filtering**: Fetch all results, then filter in TypeScript. Wasteful — could fetch an entire page of blocked users. Violates Principle IV (server-side authority). Rejected.

---

## R-7: Relationship Filter Implementation

**Decision**: The relationship filter (`friends`, `following`, `followers`, `blocked`) modifies the base query's `WHERE` clause by adding a subquery or join against the `follows` or `blocks` table. This replaces the standard `directory_visible = true` constraint for the `blocked` filter.

**Rationale**: Each relationship filter fundamentally changes which user set is returned:

- **Friends**: `WHERE EXISTS (SELECT 1 FROM follows f1 WHERE f1.follower_id = $viewer AND f1.followee_id = p.user_id) AND EXISTS (SELECT 1 FROM follows f2 WHERE f2.follower_id = p.user_id AND f2.followee_id = $viewer)`
- **Following**: `WHERE EXISTS (SELECT 1 FROM follows WHERE follower_id = $viewer AND followee_id = p.user_id)`
- **Followers**: `WHERE EXISTS (SELECT 1 FROM follows WHERE followee_id = $viewer AND follower_id = p.user_id)`
- **Blocked**: `WHERE EXISTS (SELECT 1 FROM blocks WHERE blocker_id = $viewer AND blocked_id = p.user_id)` — this is the viewer's own block list, so `directory_visible` is irrelevant (they explicitly blocked these users)

The `blocked` filter serves as a management view per US-6: users see who they've blocked and can unblock. The standard block exclusion logic is inverted here.

Other filters (role, location, teacher, text search) still combine with AND logic per FR-011.

**Alternatives considered**:
- **Separate endpoints per relationship type**: Would create 4 additional API routes that share 90% of the query logic. Violates Principle VII. A single endpoint with a `relationship` query param is simpler. Rejected.
