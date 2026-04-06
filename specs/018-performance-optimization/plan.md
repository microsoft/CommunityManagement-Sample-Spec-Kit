# Implementation Plan: Performance Optimization

**Branch**: `018-performance-optimization` | **Date**: 2026-05-27 | **Spec**: [specs/018-performance-optimization/spec.md](spec.md)
**Input**: Feature specification from `/specs/018-performance-optimization/spec.md`
**Status**: Draft

## Summary

Deliver a comprehensive performance pass across the AcroYoga Community platform. This spec closes the Spec 001 deferred backlog (T064 skeleton cards, T065 error boundaries) and introduces database-level, network-level, and render-level optimisations across the four high-traffic list pages (events, teachers, directory, community). The approach is additive: no API contracts change, no user-visible behaviour changes outside of faster loading and graceful error states. Work is organised in seven phases, each independently testable and releasable.

**Primary outcomes:**
- Route-level `loading.tsx` + skeleton card components on every list page (T064)
- Route-level `error.tsx` error boundaries with consistent i18n messages (T065)
- Composite database indexes for the five most expensive list queries
- `unstable_cache` + `revalidate` on public server-component pages
- SSR conversion: teachers page and user profile page migrated from `useEffect` to Server Components
- `remotePatterns` image-domain allowlist + above-fold `priority` attributes
- Bundle-analyser verification confirming initial JS ≤ 200 KB compressed

---

## Technical Context

**Language/Version**: TypeScript 5.9 strict mode, React 19, Next.js 16.1 App Router
**Primary Dependencies**: `next/cache` (`unstable_cache`), React `cache()`, `@next/bundle-analyzer` (already installed), `sharp` (already installed)
**New Dependencies**: none — all optimisations use Next.js / React built-ins or already-present packages
**Storage**: PostgreSQL; new composite indexes via raw SQL migration `018-001-performance-indexes.sql`
**Testing**: Vitest + PGlite (integration); React Testing Library (component); bundle-analyser output (regression guard)
**Target Platform**: Next.js web application (`apps/web/`)
**Performance Goals**:
  - LCP < 2.5 s on simulated 3G (Constitution QG)
  - Initial JS bundle < 200 KB compressed (Constitution QG-5)
  - API list endpoints cached at edge for 60 s (public, unauthenticated)
  - List queries < 50 ms p95 (index support)
**Constraints**:
  - No new external dependencies
  - N+1 queries prohibited (Constitution Principle VI — already respected in events/directory services; teachers page must be verified)
  - i18n required for all new user-facing strings (Constitution Principle VIII)
  - react-leaflet / MapPanel already dynamically loaded — do not regress
**Scale/Scope**:
  - 7 affected route segments (`/events`, `/teachers`, `/directory`, `/profile/[userId]`, `/community`, `/event-groups`, global layout)
  - 4 new skeleton card components + 1 reusable `ErrorBoundary` wrapper
  - 1 SQL migration (indexes only — no schema changes)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | No API contract changes. Performance is transparent to consumers. Cached responses return identical shapes |
| II. Test-First Development | ✅ PASS | Integration tests: index presence verified via `pg_indexes`; cache hit/miss validated; skeleton renders verified with RTL; error boundary renders verified. Coverage thresholds maintained |
| III. Privacy & Data Protection | ✅ PASS | Cache keys never include PII. Authenticated pages are not cached at route level. Only public list pages receive `revalidate` |
| IV. Server-Side Authority | ✅ PASS | SSR migration keeps all data fetching server-side. No business logic moves to client |
| V. UX Consistency | ✅ PASS | Skeleton cards use existing `Skeleton` component from `packages/shared-ui`. Error boundary UI uses existing `EmptyState` component and design tokens |
| VI. Performance Budget | ✅ PASS | **PRIMARY SPEC** — implements LCP < 2.5 s, TTI < 3.5 s, bundle ≤ 200 KB, no N+1, mutation < 1 s targets |
| VII. Simplicity | ✅ PASS | No new dependencies. Uses Next.js built-in `loading.tsx`/`error.tsx` conventions. `unstable_cache` is a single-import addition |
| VIII. Internationalisation | ✅ PASS | All new loading/error string literals added to `en.json`, `es.json`, `ar.json`. Skeleton components are purely visual (no strings) |
| IX. Scoped Permissions | ✅ PASS | Route cache applies only to public (unauthenticated) list pages. Authenticated routes remain dynamic |
| X. Notification Architecture | N/A | No notification changes |
| XI. Resource Ownership | N/A | No ownership changes |
| XII. Financial Integrity | N/A | No payment changes |
| XIII. Development Environment | ✅ PASS | All scripts run in Codespaces / Ubuntu CI. `ANALYZE=true npm run build` added to CI |
| XIV. Managed Identity | N/A | No new Azure service connections |
| QG-5: Bundle Size | ✅ PASS | Bundle analyser run gating this spec; baseline captured in research.md |
| QG-6: Accessibility | ✅ PASS | Skeleton cards use `aria-busy` / `aria-label`. Error boundaries use `role="alert"` |
| QG-9: i18n Compliance | ✅ PASS | No raw string literals — all messages via next-intl |

**Gate result: PASS — no violations. Proceed to Phase 0.**

---

## Project Structure

### Documentation (this feature)

```text
specs/018-performance-optimization/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology decisions, index analysis, bundle baseline
├── data-model.md        # Phase 1 output — index migration DDL, cache key taxonomy
├── quickstart.md        # Phase 1 output — how to run bundle analyser, verify indexes
├── contracts/           # N/A — no new API contracts (noted in research.md)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── next.config.ts                              # MODIFY — add remotePatterns for avatar/image domains
├── src/
│   ├── db/migrations/
│   │   └── 018-001-performance-indexes.sql    # NEW — composite indexes for 5 list queries
│   ├── lib/
│   │   ├── events/
│   │   │   └── service.ts                     # MODIFY — wrap listEvents with unstable_cache (public pages)
│   │   ├── teachers/
│   │   │   └── profiles.ts                    # MODIFY — wrap listTeachers with unstable_cache
│   │   └── directory/
│   │       └── service.ts                     # MODIFY — wrap listDirectory with React cache() for request deduplication
│   ├── components/
│   │   ├── skeletons/                         # NEW — skeleton loading cards
│   │   │   ├── EventCardSkeleton.tsx          # Mirrors EventCard layout; uses shared-ui Skeleton
│   │   │   ├── TeacherCardSkeleton.tsx        # Mirrors TeacherCard layout
│   │   │   ├── DirectoryCardSkeleton.tsx      # Mirrors DirectoryCard layout
│   │   │   └── ProfileSkeleton.tsx            # Hero + bio + social links skeleton
│   │   └── ErrorBoundary.tsx                  # NEW — reusable client error boundary (Spec 001 T065)
│   └── app/
│       ├── loading.tsx                        # NEW — global route loading fallback
│       ├── error.tsx                          # NEW — global route error boundary (Spec 001 T065)
│       ├── events/
│       │   ├── loading.tsx                    # NEW — skeleton grid (12 × EventCardSkeleton)
│       │   └── error.tsx                      # NEW — error state with retry
│       ├── teachers/
│       │   ├── page.tsx                       # MODIFY — convert from useEffect client to Server Component
│       │   ├── loading.tsx                    # NEW — skeleton grid (8 × TeacherCardSkeleton)
│       │   └── error.tsx                      # NEW — error state with retry
│       ├── directory/
│       │   ├── loading.tsx                    # NEW — skeleton grid (10 × DirectoryCardSkeleton)
│       │   └── error.tsx                      # NEW — error state with retry
│       └── profile/
│           └── [userId]/
│               ├── page.tsx                   # MODIFY — convert from useEffect to Server Component
│               ├── loading.tsx                # NEW — ProfileSkeleton
│               └── error.tsx                  # NEW — profile not found / error state

packages/
└── shared/src/types/
    └── (no new types — performance is transparent)
```

**Structure Decision**: Web-application layout (single `apps/web/` project). Skeleton components live alongside existing `components/` rather than in `packages/shared-ui` because they embed Next.js-specific image placeholders and app-router conventions; they are not cross-platform. The `ErrorBoundary.tsx` wrapper is also kept in `apps/web/` since it uses `next-intl` hooks for i18n.

---

## Phase Breakdown

### Phase 1: Database Indexes
Add a single migration `018-001-performance-indexes.sql` with five composite indexes targeting the highest-traffic list queries (events by status+datetime+city, rsvp counts by event_id+status, teacher_profiles by badge+deleted, directory sort by display_name, notifications by user_id+read+created_at). Verify index presence with `pg_indexes` query in integration tests.

### Phase 2: Server-Side Caching
Wrap `listEvents` and `listTeachers` service functions with `unstable_cache` (60-second TTL, tagged by entity type). Add `export const revalidate = 60` to the public events and teachers route segments. Use React `cache()` for within-request deduplication in the directory service (authenticated, so no persistent cache). Add cache invalidation calls in the write-path service functions (`createEvent`, `cancelEvent`, etc.) using `revalidateTag`.

### Phase 3: Skeleton Loading (Spec 001 T064)
Create `EventCardSkeleton`, `TeacherCardSkeleton`, `DirectoryCardSkeleton`, and `ProfileSkeleton` components using the existing `Skeleton` component from `packages/shared-ui`. Add route-level `loading.tsx` files to each affected directory. Write RTL tests confirming skeleton renders before data arrives.

### Phase 4: Error Boundaries (Spec 001 T065)
Create a global `error.tsx` and route-level `error.tsx` files. Use the existing `EmptyState` component from `packages/shared-ui` for the error UI. Include a translated "Try again" button that calls the Next.js `reset()` prop. All strings added to i18n message files.

### Phase 5: SSR Conversion
Convert `app/teachers/page.tsx` and `app/profile/[userId]/page.tsx` from `"use client"` + `useEffect` patterns to async Server Components. Data fetched directly from service functions (no internal `fetch()` call). Wrap data-dependent sections in `<Suspense>` with the new skeleton fallbacks.

### Phase 6: Image Optimisation
Add `remotePatterns` to `next.config.ts` for Azure Blob Storage hostname and any other image origins. Audit `EventCard`, profile avatar, and teacher photo usages — add `priority` prop to above-fold images and explicit `sizes` attributes to avoid layout shift.

### Phase 7: Bundle Verification
Run `ANALYZE=true npm run build` in CI, capture the bundle report, and assert initial JS chunk ≤ 200 KB compressed. Confirm `react-leaflet` chunk is not present in the initial load (already dynamic, but add an automated size assertion as a regression guard).

---

## Complexity Tracking

> No constitution violations.
