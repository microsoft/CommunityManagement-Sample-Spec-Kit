# Quickstart: Performance Optimization (Spec 018)

**Date**: 2026-05-27

This guide explains how to run, verify, and iterate on the Spec 018 performance changes locally and in CI.

---

## Prerequisites

- Node.js 22 (Codespaces / CI standard)
- Codespaces or Ubuntu Linux (Constitution XIII)
- PostgreSQL connection available (or PGlite for unit/integration tests)

---

## 1. Run the Database Migration

```bash
# From repo root — applies all pending migrations including 018-001-performance-indexes.sql
npm run db:migrate --workspace=apps/web
```

> **PGlite note**: `createTestDb()` in Vitest picks up all migration files automatically. No manual step needed for tests.

### Verify indexes were created

```bash
# Connect to your local PostgreSQL instance
psql $DATABASE_URL -c "
  SELECT tablename, indexname
  FROM pg_indexes
  WHERE indexname LIKE 'idx_%'
    AND tablename IN ('events','rsvps','event_interests','teacher_profiles','profiles')
  ORDER BY tablename, indexname;
"
```

Expected output — 5 rows:

```
  tablename      |            indexname
-----------------+-----------------------------------
 event_interests | idx_event_interests_event_id
 events          | idx_events_status_start
 profiles        | idx_profiles_display_name
 rsvps           | idx_rsvps_event_status
 teacher_profiles| idx_teacher_profiles_active_badge
```

---

## 2. Run the Test Suite

```bash
# All tests (unit + integration)
npm run test --workspace=apps/web

# Focused run — performance spec tests only
npx vitest run --workspace=apps/web --testPathPattern="018"
```

Expected test files:
- `apps/web/src/db/migrations/__tests__/018-performance-indexes.test.ts` — verifies index presence via PGlite
- `apps/web/src/components/skeletons/__tests__/EventCardSkeleton.test.tsx` — RTL snapshot
- `apps/web/src/components/skeletons/__tests__/TeacherCardSkeleton.test.tsx`
- `apps/web/src/components/skeletons/__tests__/DirectoryCardSkeleton.test.tsx`
- `apps/web/src/components/skeletons/__tests__/ProfileSkeleton.test.tsx`
- `apps/web/src/components/__tests__/ErrorBoundary.test.tsx`

---

## 3. Run the Bundle Analyser

```bash
cd apps/web

# Build with analysis enabled
ANALYZE=true npm run build
```

This opens an HTML report in your default browser (or saves to `.next/analyze/`). Check:

1. **Initial JS chunks** — the bar labelled `/_app` + `/_document` + shared chunks MUST total ≤ 200 KB compressed.
2. **`react-leaflet` / `leaflet`** — must appear only in the dynamic chunk loaded by `MapPanel`, NOT in the initial bundle.
3. **`date-fns`** — should be tree-shaken; confirm only used functions are included.

### CI assertion

The following command is added to the CI pipeline (`.github/workflows/ci.yml`):

```yaml
- name: Bundle size check
  run: |
    cd apps/web
    npm run build
    node scripts/assert-bundle-size.mjs 200   # fails if initial JS > 200 KB
```

`scripts/assert-bundle-size.mjs` is a new lightweight script (< 30 lines) that reads `.next/build-manifest.json` and sums initial chunk sizes.

---

## 4. Verify Skeleton Loading Locally

Start the development server and navigate to each page with network throttling in DevTools (set to "Slow 3G"):

```bash
npm run dev --workspace=apps/web
```

| URL | Expected skeleton |
|-----|-------------------|
| `http://localhost:3000/events` | 12 skeleton event cards |
| `http://localhost:3000/teachers` | 8 skeleton teacher cards |
| `http://localhost:3000/directory` | 10 skeleton directory cards |
| `http://localhost:3000/profile/[any-user-id]` | Profile skeleton (avatar + bio) |

The skeleton should appear immediately (< 100 ms) and be replaced by real data when the server fetch completes.

---

## 5. Verify Error Boundaries

Trigger an error boundary in development:

```bash
# Temporarily add this to app/teachers/page.tsx to test the boundary:
throw new Error("Test error boundary");
```

Expected behaviour:
- The error boundary UI renders with the "Could not load teachers. Please try again." message
- The "Try again" button resets the boundary and re-renders the page
- No blank white screen or raw stack trace visible to the user

Remove the test throw before committing.

---

## 6. Verify Image Optimisation

```bash
# Check that Next.js image optimisation is active for external domains
curl -I "http://localhost:3000/_next/image?url=https%3A%2F%2Fpicsum.photos%2F200%2F200&w=400&q=75"
```

Expected: `200 OK` with `Content-Type: image/webp` (or `image/avif` if the client header prefers it).

---

## 7. Verify SSR Conversion

```bash
# Teachers page should return HTML with teacher names in the initial response (not a loading spinner)
curl -s http://localhost:3000/teachers | grep -i "teacher\|Certified"
```

If you see teacher data in the raw HTML, SSR is working correctly.

---

## 8. Environment Variables

No new environment variables are required by Spec 018. The Azure Blob Storage hostname is static and configured in `next.config.ts`. All caching is handled by Next.js internals.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `unstable_cache` not caching between requests | Ensure `NODE_ENV=production`; caching is disabled in `development` mode |
| `CONCURRENTLY` error in PGlite | PGlite ignores the `CONCURRENTLY` keyword — this is expected and safe |
| Image domain not allowed error | Add the hostname to `remotePatterns` in `next.config.ts` |
| Teachers page shows empty on SSR | Check that `listTeachersCached` service function is correctly exported and imported |
