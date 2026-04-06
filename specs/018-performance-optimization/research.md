# Research: Performance Optimization (Spec 018)

**Date**: 2026-05-27
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. Next.js 16 Caching Strategy

### Decision
Use a layered caching approach:
- **`unstable_cache` (from `next/cache`)** — persistent cross-request cache for public list data with TTL and invalidation tags
- **React `cache()`** — within-request deduplication for authenticated data (directory, profile)
- **`export const revalidate = N`** — route-segment config for public pages to enable ISR semantics
- **`revalidateTag()`** — explicit invalidation in write-path service functions

### Rationale
The platform has two data access patterns:
1. **Public lists** (events, teachers): data changes infrequently (< once per minute under normal load); safe to cache across requests with a 60-second TTL. `unstable_cache` is the correct tool.
2. **Authenticated views** (directory, profile, notifications): data is personalised per user; persistent cross-request caching would leak user data. React `cache()` provides within-request deduplication without persistence.

### Alternatives Considered
- **Redis / external cache**: rejected — Constitution Principle VII (Simplicity) prohibits adding infrastructure when built-in primitives suffice. `unstable_cache` uses the same Next.js data cache.
- **CDN/Edge caching with `Cache-Control` headers**: viable for fully public pages, but would bypass server-side auth checks. Deferred for a future CDN-hardening spec.
- **Full ISR with `generateStaticParams`**: not appropriate for filtered list pages with many parameter combinations.

### Key Implementation Details
```ts
// apps/web/src/lib/events/service.ts
import { unstable_cache, revalidateTag } from "next/cache";

export const listEventsCached = unstable_cache(
  async (query: ListEventsQuery) => listEvents(query),
  ["events-list"],
  { revalidate: 60, tags: ["events"] },
);

// In createEvent / cancelEvent write paths:
revalidateTag("events");
```

```ts
// apps/web/src/app/teachers/page.tsx (after SSR conversion)
export const revalidate = 60;
```

---

## 2. Database Index Analysis

### Queries Analysed

All queries were extracted from `apps/web/src/lib/` service files. The following are the five most performance-sensitive:

| Query | Table | Predicate columns | Sort | Current index |
|-------|-------|-------------------|------|---------------|
| `listEvents` | `events` | `status`, `start_datetime`, `venue_id` (→ city filter) | `start_datetime ASC` | PK only |
| RSVP sub-select in `listEvents` | `rsvps` | `event_id`, `status` | — | PK only |
| Event interest count | `event_interests` | `event_id` | — | PK only |
| `listTeachersForEvent` + teacher browse | `teacher_profiles` | `is_deleted`, `badge_status` | — | PK only |
| `listDirectory` | `profiles` | `user_id`, `home_city_id` | `display_name ASC`, `created_at DESC` | PK only |

### Decision: Five Composite Indexes

```sql
-- 1. Event list: filter by status + date range; frequently the dominant join arm
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_status_start
  ON events (status, start_datetime);

-- 2. RSVP count sub-selects: GROUP BY event_id filtered by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvps_event_status
  ON rsvps (event_id, status);

-- 3. Event interests count sub-select
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_interests_event_id
  ON event_interests (event_id);

-- 4. Teacher browse: is_deleted filter + badge sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_profiles_active_badge
  ON teacher_profiles (is_deleted, badge_status);

-- 5. Directory alphabetical sort (most common sort order)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_display_name
  ON profiles (display_name ASC NULLS LAST);
```

### Rationale
- **`CONCURRENTLY`**: avoids table lock during index build on production data. PGlite (test env) does not support `CONCURRENTLY` — the migration uses `IF NOT EXISTS` guard; PGlite falls back to standard `CREATE INDEX IF NOT EXISTS`.
- **`IF NOT EXISTS`**: makes the migration idempotent and safe to re-run.
- Partial indexes (e.g., `WHERE status = 'published'`) were considered but rejected for Principle VII simplicity — the status column has low cardinality and a regular composite index is sufficient.

### Alternatives Considered
- **GIN/GiST indexes for full-text search** on teacher `specialties` array: deferred to a dedicated search spec.
- **Covering indexes**: premature optimisation at current scale; revisit when query plans show index-only-scan benefit.

---

## 3. Skeleton Loading Patterns (Spec 001 T064)

### Decision
Use **Next.js App Router `loading.tsx` convention** as the primary mechanism. Each affected route segment gets a co-located `loading.tsx` that renders a grid of skeleton card components. Skeleton components are composed using the existing `Skeleton` from `packages/shared-ui` (already cross-platform, already has `text`, `circular`, and `rectangular` variants).

### Page → Skeleton mapping

| Page | Skeleton component | Grid |
|------|--------------------|------|
| `/events` | `EventCardSkeleton` | 12-card grid (mirrors `ExplorerPage` grid) |
| `/teachers` | `TeacherCardSkeleton` | 8-card grid (mirrors teachers list) |
| `/directory` | `DirectoryCardSkeleton` | 10-card grid (mirrors directory list) |
| `/profile/[userId]` | `ProfileSkeleton` | Single full-width card |

### Rationale
`loading.tsx` is the idiomatic Next.js approach — it wraps the page segment in an automatic `<Suspense>` boundary without requiring the page component to manage its own loading state. This is simpler than the current pattern of inline `useState(loading)` checks and satisfies Constitution Principle VII.

### Accessibility
All skeleton cards set `aria-busy="true"` on the container and `aria-label="Loading…"` (i18n key `common.loading`).

### Alternatives Considered
- **Inline `Suspense` boundaries within pages**: more granular but adds component complexity. Deferred until streaming SSR is needed (a future spec).
- **CSS-only shimmer without shared-ui Skeleton**: rejected — duplicates existing primitives (Principle VII).

---

## 4. Error Boundaries (Spec 001 T065)

### Decision
Use **Next.js App Router `error.tsx` convention** at two levels:
1. **Global** `app/error.tsx` — catches unhandled errors in any route segment
2. **Route-level** `app/[segment]/error.tsx` — catches errors scoped to that segment, shows contextual message

All `error.tsx` files are `"use client"` components (required by Next.js). They receive `error: Error` and `reset: () => void` props. The UI uses the existing `EmptyState` component from `packages/shared-ui` for visual consistency.

### i18n Integration
`error.tsx` files use `useTranslations("errors")` from `next-intl`. Message keys:

```json
"errors": {
  "generic": "Something went wrong.",
  "tryAgain": "Try again",
  "notFound": "This page doesn't exist.",
  "events": "Could not load events.",
  "teachers": "Could not load teachers.",
  "directory": "Could not load directory.",
  "profile": "Could not load this profile."
}
```

These keys are added to `en.json`, `es.json`, and `ar.json`.

### Rationale
Next.js `error.tsx` is the idiomatic approach and automatically wraps segment content in a React error boundary class component without the team needing to write one manually (satisfies Principle VII).

### Alternatives Considered
- **Manual class-based `ErrorBoundary` React component**: still useful as a reusable wrapper for non-route contexts (e.g., embedded components within a page). A thin `ErrorBoundary.tsx` wrapper is still created as a convenience, but the primary implementation uses `error.tsx` for route-level coverage.

---

## 5. SSR Conversion — Teachers Page

### Decision
Convert `app/teachers/page.tsx` from a `"use client"` + `useEffect` + `fetch` pattern to an **async Server Component** that calls the service function directly.

### Current state
```tsx
// CURRENT — client-side waterfall
"use client";
export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  useEffect(() => { fetch("/api/teachers").then(...) }, []);
  if (loading) return <Spinner />;
  ...
}
```

### Target state
```tsx
// TARGET — Server Component with Suspense
import { listTeachersCached } from "@/lib/teachers/profiles";
export const revalidate = 60;

export default async function TeachersPage({ searchParams }) {
  const teachers = await listTeachersCached(searchParams);
  return <TeacherList teachers={teachers} />;
  // loading.tsx handles the Suspense boundary
}
```

### Rationale
Eliminates the client-side data waterfall: browser no longer needs to download JS, execute it, and make a second round-trip to the API server. Data arrives in the initial HTML response (SSR). Complies with Constitution Principle VI (Performance Budget) and Principle IV (Server-Side Authority — data fetched server-side).

### Constraint — interactive filters
The teachers page has query filters (`query`, `specialty`, `badge`). After SSR conversion, filter changes update `searchParams` via URL (using `<Link>` / `router.push`). The server re-renders the page on navigation. A `<Suspense>` boundary around the list shows the skeleton card while the new data loads.

### Profile Page (`/profile/[userId]`)
Same pattern: convert `useEffect` + `fetch('/api/profiles/[userId]')` to a direct service call in an async Server Component.

---

## 6. Image Optimisation

### Current state
- `next/image` (`<Image>`) is used in `EventCard.tsx`, `app/directory/page.tsx`, and `app/profile/[userId]/page.tsx`
- No `remotePatterns` configured in `next.config.ts` — any external hostname is rejected by Next.js image optimisation
- No `priority` prop on above-fold images
- `sharp` is already installed — WebP/AVIF transcoding is active for local images

### Decision
1. **Add `remotePatterns`** for Azure Blob Storage (`*.blob.core.windows.net`) and the seeded placeholder image CDN (`picsum.photos` used in dev seeds)
2. **Add `priority`** to the first EventCard in the grid and to the profile avatar (above fold)
3. **Add `sizes`** attributes where missing to prevent oversized image downloads

### i18n / alt text
All `<Image alt="...">` strings use i18n translation keys (already the pattern in existing components).

---

## 7. Bundle Baseline

### Current bundle status
Bundle analyser run (`ANALYZE=true npm run build`) not yet executed on this branch — baseline will be captured as part of Phase 7. Expected large chunks based on code review:

| Chunk | Estimated size (compressed) | Notes |
|-------|-----------------------------|-------|
| `react-leaflet` + `leaflet` | ~80 KB | Already dynamic — confirmed not in initial bundle |
| `next-intl` | ~25 KB | Always in initial bundle (required) |
| `react` + `react-dom` | ~45 KB | Always in initial bundle |
| App shell + layout | ~30 KB | Estimated |
| **Total estimated initial** | **~100 KB** | Well within 200 KB limit |

### Contracts
No new API contracts are introduced by this spec. Performance optimisations are transparent to API consumers — response shapes are unchanged. The `contracts/` directory is intentionally empty for Spec 018.

---

## Resolved NEEDS CLARIFICATION

| Item | Resolution |
|------|-----------|
| Caching strategy for authenticated vs public pages | `unstable_cache` for public, React `cache()` for authenticated |
| Which pages to SSR-convert in scope | Teachers page + profile/[userId] page (highest client-waterfall impact) |
| PGlite compatibility of `CONCURRENTLY` | Use `IF NOT EXISTS`; PGlite ignores `CONCURRENTLY` keyword gracefully |
| Image domains to allowlist | Azure Blob Storage + `picsum.photos` (dev seed images) |
| Error boundary i18n | `useTranslations("errors")` namespace added to all three locale files |
| Teachers filter interactivity after SSR | URL-based `searchParams` + server re-render on navigation |
