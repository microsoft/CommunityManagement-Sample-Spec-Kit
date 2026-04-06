# Data Model: Performance Optimization (Spec 018)

**Date**: 2026-05-27
**Status**: Complete

> **No new database tables or columns are introduced.** Performance optimisations in this spec operate at the index, caching, and rendering layers only. The schema is unchanged.

---

## 1. New Database Indexes

Migration file: `apps/web/src/db/migrations/018-001-performance-indexes.sql`

### Index Definitions

```sql
-- ============================================================
-- Spec 018: Performance Indexes
-- No schema changes — indexes only.
-- All indexes are CONCURRENT + IF NOT EXISTS (idempotent, non-blocking).
-- ============================================================

-- 1. Event list filtering: status + date range scan
-- Supports: listEvents() WHERE status = 'published' AND start_datetime >= ...
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_status_start
  ON events (status, start_datetime);

-- 2. RSVP count aggregations (sub-selects inside listEvents)
-- Supports: SELECT COUNT(*) FROM rsvps WHERE event_id = $1 AND status IN (...)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvps_event_status
  ON rsvps (event_id, status);

-- 3. Event interest count aggregation (sub-select inside listEvents)
-- Supports: SELECT COUNT(*) FROM event_interests WHERE event_id = $1
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_interests_event_id
  ON event_interests (event_id);

-- 4. Teacher browse: non-deleted teachers sorted by badge status
-- Supports: listTeachers() WHERE is_deleted = false ORDER BY badge_status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_profiles_active_badge
  ON teacher_profiles (is_deleted, badge_status);

-- 5. Directory alphabetical sort (default sort order)
-- Supports: listDirectory() ORDER BY display_name ASC NULLS LAST
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_display_name
  ON profiles (display_name ASC NULLS LAST);
```

### Index Verification Query (for integration tests)

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('events', 'rsvps', 'event_interests', 'teacher_profiles', 'profiles')
  AND indexname IN (
    'idx_events_status_start',
    'idx_rsvps_event_status',
    'idx_event_interests_event_id',
    'idx_teacher_profiles_active_badge',
    'idx_profiles_display_name'
  )
ORDER BY tablename, indexname;
```

Expected: 5 rows returned.

---

## 2. Cache Key Taxonomy

The following cache keys are introduced in the `next/cache` layer. These are not persisted to the database but are documented here to prevent naming conflicts in future specs.

| Cache tag | Function | TTL | Invalidated by |
|-----------|----------|-----|----------------|
| `"events"` | `listEventsCached()` | 60 s | `createEvent()`, `cancelEvent()`, `updateEvent()` |
| `"teachers"` | `listTeachersCached()` | 60 s | `createTeacherProfile()`, `updateBadgeStatus()` |

Authenticated endpoints (directory, profile, notifications) are **not** persistently cached. React `cache()` provides within-request deduplication only and does not appear in this taxonomy.

---

## 3. New Component Interfaces

### `EventCardSkeleton`
```tsx
// apps/web/src/components/skeletons/EventCardSkeleton.tsx
// Props: none (fixed layout mirrors EventCard)
// Renders: rectangular title block + two text lines + date/category row
// Uses: Skeleton variant="rectangular" + variant="text" from shared-ui
```

### `TeacherCardSkeleton`
```tsx
// apps/web/src/components/skeletons/TeacherCardSkeleton.tsx
// Props: none
// Renders: circular avatar + name text + bio text (2 lines) + badge chip
```

### `DirectoryCardSkeleton`
```tsx
// apps/web/src/components/skeletons/DirectoryCardSkeleton.tsx
// Props: none
// Renders: circular avatar + display name + home city + social link stubs
```

### `ProfileSkeleton`
```tsx
// apps/web/src/components/skeletons/ProfileSkeleton.tsx
// Props: none
// Renders: large circular avatar + name + bio (3 lines) + social links row
```

### `ErrorBoundary`
```tsx
// apps/web/src/components/ErrorBoundary.tsx
// Props: { children: ReactNode; fallback?: ReactNode }
// Client component — wraps children in a React error boundary class
// Falls back to EmptyState with translated "Something went wrong" message
// Used for inline component-level errors (not route-level; those use error.tsx)
```

---

## 4. i18n Message Keys Added

Added to `apps/web/src/i18n/messages/en.json`, `es.json`, `ar.json`:

```json
{
  "common": {
    "loading": "Loading…"
  },
  "errors": {
    "generic": "Something went wrong.",
    "tryAgain": "Try again",
    "notFound": "This page doesn't exist.",
    "events": "Could not load events. Please try again.",
    "teachers": "Could not load teachers. Please try again.",
    "directory": "Could not load members. Please try again.",
    "profile": "Could not load this profile. Please try again."
  }
}
```

> Translation for `es` and `ar` follows the same key structure with translated values (to be filled by translation contributors or auto-translated as per Spec 014 convention).

---

## 5. Route Segment Changes

| Route | Change | Reason |
|-------|--------|--------|
| `app/events/` | Add `loading.tsx`, `error.tsx`; add `revalidate = 60` | Skeleton + error boundary |
| `app/teachers/` | Convert `page.tsx` to Server Component; add `loading.tsx`, `error.tsx`; add `revalidate = 60` | SSR + skeleton + error boundary |
| `app/directory/` | Add `loading.tsx`, `error.tsx` | Skeleton + error boundary (page stays client — infinite scroll requires client state) |
| `app/profile/[userId]/` | Convert `page.tsx` to Server Component; add `loading.tsx`, `error.tsx` | SSR + skeleton + error boundary |
| `app/` (root) | Add `loading.tsx`, `error.tsx` | Global fallback |

> **Note on directory page**: The directory page uses infinite scroll (`IntersectionObserver`) and optimistic social actions (follow/unfollow/block), which require client state. It is converted to a hybrid: the filter bar and initial SSR data are server-rendered; the list section is a `"use client"` component receiving the initial data as props. `loading.tsx` covers the initial render.

---

## 6. `next.config.ts` Changes

```ts
// apps/web/next.config.ts — additions only
const nextConfig = {
  // existing fields ...
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net", // Azure Blob Storage (teacher photos, avatars)
      },
      {
        protocol: "https",
        hostname: "picsum.photos",            // Dev seed placeholder images
      },
    ],
  },
};
```
