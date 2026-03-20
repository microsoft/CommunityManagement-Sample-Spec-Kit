# Quickstart: User Directory (Spec 009)

**Branch**: `009-user-directory`

---

## Prerequisites

- Node.js 22+ with npm 10+
- WSL (all commands run in WSL — Constitution XIII)
- Specs 002, 004, and 005 migrations already applied (tables: `user_profiles`, `social_links`, `follows`, `blocks`, `mutes`, `geography`, `teacher_profiles`)

## Setup

```bash
# From repo root (in WSL)
git checkout 009-user-directory
npm install
```

## Database Migration

Apply the single migration that adds `directory_visible` to `user_profiles` and expands the social links platform enum:

```bash
# From repo root
npm run db:migrate
# This runs: specs/009-user-directory/ → 009_user_directory.sql
```

### Migration contents (summary)

1. `ALTER TABLE user_profiles ADD COLUMN directory_visible BOOLEAN NOT NULL DEFAULT false`
2. Expand `social_links.platform` CHECK constraint to 8 values
3. Create 5 partial indexes for directory query performance

### Verify migration

```bash
# In psql or via the dev seed script
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'directory_visible';
-- Expected: boolean, false
```

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/api/directory/route.ts` | GET endpoint — directory search/filter/paginate |
| `apps/web/src/lib/directory/service.ts` | Query builder, visibility logic, filter composition |
| `apps/web/src/lib/directory/completeness.ts` | Profile completeness calculator (pure function) |
| `packages/shared/src/types/directory.ts` | Shared TypeScript types (DirectoryEntry, query params) |
| `packages/shared-ui/src/DirectoryCard/` | Directory card component (5-file pattern) |
| `packages/shared-ui/src/SocialIcons/` | Social platform icon component (5-file pattern) |

## Running Tests

```bash
# All directory integration tests (PGlite — no external DB needed)
npm run test -- --filter directory

# Specific test file
npm run test -- apps/web/tests/integration/directory/directory-listing.test.ts

# Watch mode during development
npm run test -- --watch --filter directory
```

### Test file map

| Test File | What It Covers |
|-----------|----------------|
| `directory-listing.test.ts` | Core listing, visibility opt-in, cursor pagination, hasNextPage |
| `directory-filters.test.ts` | Role, location (city/country/continent), teacher, text search, AND combination |
| `directory-relationships.test.ts` | Relationship filter (friends/following/followers/blocked), block exclusion |
| `directory-proximity.test.ts` | Proximity sort tiers, no-city fallback, sub-sort within tiers |
| `directory-visibility.test.ts` | Social link visibility per relationship, visibility toggle, GDPR |

### Test database pattern

All tests use the `createTestDb()` helper from the existing test infrastructure:

```typescript
import { createTestDb } from '@/lib/db/test-utils';

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb(); // PGlite in-memory instance with all migrations
});

afterEach(async () => {
  await db.cleanup();
});
```

## API Usage

### Browse the directory (first page)

```bash
curl -H "Cookie: $SESSION" \
  'http://localhost:3000/api/directory?pageSize=20&sort=alphabetical'
```

### Search by name + filter by role

```bash
curl -H "Cookie: $SESSION" \
  'http://localhost:3000/api/directory?search=Mar&role=flyer&sort=alphabetical'
```

### Proximity sort

```bash
curl -H "Cookie: $SESSION" \
  'http://localhost:3000/api/directory?sort=proximity&pageSize=20'
```

### Load next page (cursor)

```bash
curl -H "Cookie: $SESSION" \
  'http://localhost:3000/api/directory?cursor=eyJk...&pageSize=20&sort=alphabetical'
```

### Toggle directory visibility

```bash
curl -X PATCH -H "Cookie: $SESSION" -H "Content-Type: application/json" \
  -d '{"directoryVisible": true}' \
  'http://localhost:3000/api/profiles/me'
```

## Seed Data (Development)

The development seed script should create users with varied `directory_visible` states:

```typescript
// In _test-seed.mjs or equivalent
// Ensure at least:
// - 5+ users with directory_visible = true (various roles, cities, teacher status)
// - 2+ users with directory_visible = false
// - 1+ mutual follow pair (friends)
// - 1+ block pair
// - Users with social links at various visibility levels
// - Users with and without home cities
// - At least 1 verified teacher
```

## Architecture Notes

- **Single endpoint**: `GET /api/directory` handles all search, filter, sort, and pagination via query params
- **Single SQL query**: No N+1 — all data (profile, geography, teacher badge, social links, relationships) fetched in one query with JOINs and `json_agg()`
- **Cursor-based pagination**: Opaque base64 cursor encoding `(sort_value, id)` — never offset
- **Social link visibility**: Filtered server-side in the SQL query's `json_agg() FILTER` clause
- **Block exclusion**: `NOT EXISTS` subquery — symmetric (neither party sees the other)
- **Profile completeness**: Pure function in `completeness.ts` — never stored, computed at render time (FR-027)
- **Relationship actions**: Reuse existing `POST/DELETE /api/follows` and `POST/DELETE /api/blocks` from Spec 002 — no new mutation endpoints

## Common Pitfalls

1. **Forgetting block exclusion in relationship filters**: The "blocked" relationship filter shows the viewer's own block list — but the standard block exclusion logic must still apply for all other filters.
2. **Social link visibility leaking**: Always filter via the SQL `FILTER` clause, not in application code after fetching. Server-side authority (Principle IV).
3. **Cursor invalidation**: If a user changes their display name during pagination with alphabetical sort, the cursor may skip or repeat entries. This is an accepted trade-off documented in the spec ("does not need real-time updates").
4. **Proximity sort without viewer city**: Must fall back to alphabetical. Don't error — handle gracefully per FR-030.
