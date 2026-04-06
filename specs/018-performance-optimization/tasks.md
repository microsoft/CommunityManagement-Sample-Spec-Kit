# Tasks: Performance Optimization (Spec 018)

**Input**: Design documents from `/specs/018-performance-optimization/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅, contracts/ ✅ (N/A — no new API contracts)

**Tests**: Included — plan.md and quickstart.md explicitly specify integration tests (PGlite index verification), RTL component tests (skeleton cards, error boundary). Constitution Principle II requires tests for all service functions and new components.

**Organization**: Tasks are grouped by user story (mapped from plan.md's 7 phases). Each phase/story is independently deliverable. No shared types or schema changes — performance is transparent to API consumers.

**Cross-Spec Note**: This spec closes **Spec 001 deferred tasks T064** (skeleton cards → US3 below) and **T065** (error boundaries → US4 below). The `Skeleton` component from `packages/shared-ui` and `EmptyState` from `packages/shared-ui` are already in place and must be used (not re-created).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US7)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Create the SQL migration file that is the single prerequisite for the database index integration test (US1). All other phases are independent of this and of each other.

- [ ] T001 Create SQL migration file with 5 composite indexes (`CONCURRENTLY IF NOT EXISTS` for idempotency) — copy DDL verbatim from `specs/018-performance-optimization/data-model.md §1` — in `apps/web/src/db/migrations/018-001-performance-indexes.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add i18n message keys required by both US3 (skeleton `aria-label`) and US4 (error boundary strings). Must be complete before skeleton and error boundary components can be built.

**⚠️ CRITICAL**: US3 skeleton components and US4 error boundary components both depend on i18n keys. Complete this phase first.

- [ ] T002 Add i18n keys (`common.loading`, `errors.generic`, `errors.tryAgain`, `errors.notFound`, `errors.events`, `errors.teachers`, `errors.directory`, `errors.profile`) to `apps/web/messages/en.json` — values from `data-model.md §4`
- [ ] T003 [P] Add the same key structure with Spanish-translated values to `apps/web/messages/es.json`
- [ ] T004 [P] Add the same key structure with Arabic-translated values to `apps/web/messages/ar.json`

**Checkpoint**: i18n keys available in all three locales. Skeleton and error boundary components can now reference `common.loading` and `errors.*` keys.

---

## Phase 3: User Story 1 — Database Indexes (Priority: P1) 🎯 MVP

**Goal**: Five composite indexes land in a single idempotent SQL migration, verified by a PGlite integration test. No schema changes — indexes only. All five list queries drop from full-table-scan to index-scan paths.

**Independent Test**: Run `npm run db:migrate --workspace=apps/web`. Query `pg_indexes` for the five named indexes — exactly 5 rows returned. Run `npx vitest run --workspace=apps/web --testPathPattern="018"` — test passes.

- [ ] T005 [US1] Write PGlite integration test that runs `018-001-performance-indexes.sql` via `createTestDb()` and asserts all 5 index names are present in `pg_indexes` — in `apps/web/src/db/migrations/__tests__/018-performance-indexes.test.ts`

**Checkpoint**: Migration applies cleanly. Integration test passes with all 5 indexes confirmed present.

---

## Phase 4: User Story 2 — Server-Side Caching (Priority: P1)

**Goal**: Public list pages (events, teachers) served from a 60-second cross-request cache. Write paths invalidate the cache via `revalidateTag`. Authenticated list (directory) uses within-request deduplication only. No user-visible behaviour changes.

**Independent Test**: Cold-request `/events` — response arrives from `listEventsCached()`. Second request within 60 s arrives from cache (verify via server log or cache hit header). Call `createEvent()` — next `listEventsCached()` call fetches fresh data. Directory page makes two calls to `searchDirectory()` in the same request — only one DB query executes.

- [ ] T006 [US2] Wrap `listEvents()` with `unstable_cache` exported as `listEventsCached()` (cache key `["events-list"]`, tags `["events"]`, revalidate `60`) in `apps/web/src/lib/events/service.ts`
- [ ] T007 [US2] Add `revalidateTag("events")` calls in `createEvent()`, `cancelEvent()`, `updateEvent()`, and `deleteEvent()` write-path functions in `apps/web/src/lib/events/service.ts`
- [ ] T008 [P] [US2] Wrap `searchTeachers()` with `unstable_cache` exported as `searchTeachersCached()` (cache key `["teachers-list"]`, tags `["teachers"]`, revalidate `60`) in `apps/web/src/lib/teachers/profiles.ts`
- [ ] T009 [P] [US2] Add `revalidateTag("teachers")` calls in `updateTeacherProfile()` and `deleteTeacherProfile()` write-path functions in `apps/web/src/lib/teachers/profiles.ts`
- [ ] T010 [US2] Wrap `searchDirectory()` with React `cache()` for within-request deduplication (no persistent cross-request caching — authenticated data) in `apps/web/src/lib/directory/service.ts`
- [ ] T011 [US2] Add `export const revalidate = 60` to the public events route segment in `apps/web/src/app/events/page.tsx`

**Checkpoint**: `listEventsCached` and `searchTeachersCached` use the Next.js data cache. Write paths invalidate tags. Directory deduplication active within a request. Route-level `revalidate` set for events.

---

## Phase 5: User Story 3 — Skeleton Loading / Spec 001 T064 (Priority: P1)

**Goal**: Every high-traffic list page shows an instant skeleton grid while server data loads. Four skeleton card components built from the existing `Skeleton` component in `packages/shared-ui`. Route-level `loading.tsx` files in all affected segments. All skeletons are accessible (`aria-busy`, `aria-label`).

**Independent Test**: Open `http://localhost:3000/events` with DevTools → Network throttled to Slow 3G. A grid of 12 skeleton cards appears instantly (< 100 ms). Cards are replaced by real event data on fetch completion. Repeat for `/teachers` (8 cards), `/directory` (10 cards), `/profile/[any-id]` (profile skeleton).

### Skeleton Components

- [ ] T012 [P] [US3] Create `EventCardSkeleton` component: rectangular title block + two text lines + date/category row using `Skeleton` from `packages/shared-ui`; container has `aria-busy="true"` and `aria-label` bound to `t("common.loading")` — in `apps/web/src/components/skeletons/EventCardSkeleton.tsx`
- [ ] T013 [P] [US3] Create `TeacherCardSkeleton` component: circular avatar + name text line + two bio text lines + badge chip using `Skeleton` from `packages/shared-ui`; `aria-busy="true"`, `aria-label` from `t("common.loading")` — in `apps/web/src/components/skeletons/TeacherCardSkeleton.tsx`
- [ ] T014 [P] [US3] Create `DirectoryCardSkeleton` component: circular avatar + display name line + home city line + social link stubs using `Skeleton` from `packages/shared-ui`; `aria-busy="true"`, `aria-label` from `t("common.loading")` — in `apps/web/src/components/skeletons/DirectoryCardSkeleton.tsx`
- [ ] T015 [P] [US3] Create `ProfileSkeleton` component: large circular avatar + name line + three bio text lines + social links row using `Skeleton` from `packages/shared-ui`; `aria-busy="true"`, `aria-label` from `t("common.loading")` — in `apps/web/src/components/skeletons/ProfileSkeleton.tsx`

### Route Loading Files

- [ ] T016 [US3] Create global route loading fallback rendering a centred `common.loading` translated string (or minimal spinner) in `apps/web/src/app/loading.tsx`
- [ ] T017 [US3] Create events route loading file rendering a 12-card grid of `EventCardSkeleton` (matching the existing `ExplorerPage` grid layout) in `apps/web/src/app/events/loading.tsx`
- [ ] T018 [P] [US3] Create teachers route loading file rendering an 8-card grid of `TeacherCardSkeleton` in `apps/web/src/app/teachers/loading.tsx`
- [ ] T019 [P] [US3] Create directory route loading file rendering a 10-card grid of `DirectoryCardSkeleton` in `apps/web/src/app/directory/loading.tsx`
- [ ] T020 [P] [US3] Create profile route loading file rendering a single `ProfileSkeleton` (full-width) in `apps/web/src/app/profile/[userId]/loading.tsx`

### Tests

- [ ] T021 [P] [US3] Write RTL snapshot test for `EventCardSkeleton` asserting render, `aria-busy="true"`, and no visible text content — in `apps/web/src/components/skeletons/__tests__/EventCardSkeleton.test.tsx`
- [ ] T022 [P] [US3] Write RTL snapshot test for `TeacherCardSkeleton` asserting render and accessibility attributes — in `apps/web/src/components/skeletons/__tests__/TeacherCardSkeleton.test.tsx`
- [ ] T023 [P] [US3] Write RTL snapshot test for `DirectoryCardSkeleton` asserting render and accessibility attributes — in `apps/web/src/components/skeletons/__tests__/DirectoryCardSkeleton.test.tsx`
- [ ] T024 [P] [US3] Write RTL snapshot test for `ProfileSkeleton` asserting render and accessibility attributes — in `apps/web/src/components/skeletons/__tests__/ProfileSkeleton.test.tsx`

**Checkpoint**: All four skeleton components render with correct aria attributes. All five `loading.tsx` files exist. RTL tests pass.

---

## Phase 6: User Story 4 — Error Boundaries / Spec 001 T065 (Priority: P1)

**Goal**: Every list route segment shows a contextual, translated error message with a "Try again" reset button when a server error occurs. Route-level `error.tsx` files use the existing `EmptyState` component from `packages/shared-ui`. A reusable `ErrorBoundary` wrapper for non-route contexts is also created.

**Independent Test**: Temporarily `throw new Error("test")` at the top of `app/teachers/page.tsx`. Navigate to `/teachers` — the teachers error boundary renders "Could not load teachers. Please try again." with a "Try again" button. Click "Try again" — the page re-renders without a blank screen or raw stack trace. Remove the test throw before committing.

### Error Boundary Component

- [ ] T025 [US4] Create reusable `ErrorBoundary` client component accepting `{ children: ReactNode; fallback?: ReactNode }` props; falls back to `EmptyState` with `t("errors.generic")` message; uses `role="alert"` on the fallback container — in `apps/web/src/components/ErrorBoundary.tsx`

### Route Error Files

- [ ] T026 [US4] Create global route error boundary (`"use client"`) receiving `{ error: Error; reset: () => void }` props; renders `EmptyState` with `t("errors.generic")`, `role="alert"`, and a `t("errors.tryAgain")` reset button — in `apps/web/src/app/error.tsx`
- [ ] T027 [US4] Create events route error file (`"use client"`) rendering `EmptyState` with `t("errors.events")` message and `t("errors.tryAgain")` reset button — in `apps/web/src/app/events/error.tsx`
- [ ] T028 [P] [US4] Create teachers route error file (`"use client"`) rendering `EmptyState` with `t("errors.teachers")` message and `t("errors.tryAgain")` reset button — in `apps/web/src/app/teachers/error.tsx`
- [ ] T029 [P] [US4] Create directory route error file (`"use client"`) rendering `EmptyState` with `t("errors.directory")` message and `t("errors.tryAgain")` reset button — in `apps/web/src/app/directory/error.tsx`
- [ ] T030 [P] [US4] Create profile route error file (`"use client"`) rendering `EmptyState` with `t("errors.profile")` message and `t("errors.tryAgain")` reset button — in `apps/web/src/app/profile/[userId]/error.tsx`

### Tests

- [ ] T031 [US4] Write RTL test for `ErrorBoundary` component: mount with a child that throws, assert fallback renders with `role="alert"` and translated `errors.generic` text — in `apps/web/src/components/__tests__/ErrorBoundary.test.tsx`

**Checkpoint**: All route error files exist. `ErrorBoundary` wrapper renders correctly. Triggering an error on any list page shows the contextual translated message and working "Try again" button. No raw stack traces visible.

---

## Phase 7: User Story 5 — SSR Conversion (Priority: P2)

**Goal**: `app/teachers/page.tsx` and `app/profile/[userId]/page.tsx` converted from `"use client"` + `useEffect` + `fetch` waterfalls to async Server Components fetching data directly from service functions. Teacher data arrives in initial HTML. Profile data arrives in initial HTML. Filter changes on the teachers page use URL-based `searchParams`.

**Independent Test**: Run `curl -s http://localhost:3000/teachers | grep -i "teacher\|Certified"` — teacher names appear in raw HTML response (not a loading spinner placeholder). Run the same for `/profile/[any-user-id]` — profile name appears in HTML. Verify `loading.tsx` skeleton still shows during navigation (Next.js streaming).

- [ ] T032 [US5] Convert `apps/web/src/app/teachers/page.tsx` from `"use client"` + `useEffect` to an `async` Server Component: remove `useState`/`useEffect`/`fetch`, call `searchTeachersCached(searchParams)` directly, add `export const revalidate = 60`, keep filter UI as a separate `"use client"` child component using URL `searchParams` via `<Link>`/`router.push`
- [ ] T033 [P] [US5] Convert `apps/web/src/app/profile/[userId]/page.tsx` from `"use client"` + `useEffect` to an `async` Server Component: remove `useState`/`useEffect`/`fetch`, call profile service function directly using the `userId` route param, keep any interactive client sections (follow/social actions) as `"use client"` child components
- [ ] T034 [US5] Wrap the teacher list rendering section in `apps/web/src/app/teachers/page.tsx` in a `<Suspense>` boundary with `TeacherCardSkeleton` as fallback to enable streaming skeleton display during `searchParams`-triggered re-renders

**Checkpoint**: Teacher page and profile page return populated HTML in `curl` output. Client-side waterfall eliminated. `loading.tsx` skeleton still visible during initial and navigated loads. Teacher filters work via URL `searchParams`.

---

## Phase 8: User Story 6 — Image Optimisation (Priority: P2)

**Goal**: External image domains allowlisted in `next.config.ts` so `next/image` optimisation is active for Azure Blob Storage and dev placeholder images. Above-fold images on event list, teachers list, and profile pages have `priority` prop set. All `<Image>` usages have explicit `sizes` to prevent oversized downloads.

**Independent Test**: Run `curl -I "http://localhost:3000/_next/image?url=https%3A%2F%2Fpicsum.photos%2F200%2F200&w=400&q=75"` — response is `200 OK` with `Content-Type: image/webp`. Confirm no "hostname is not configured" errors in the browser console on any page with external images.

- [ ] T035 [US6] Add `images.remotePatterns` to `apps/web/next.config.ts` for `*.blob.core.windows.net` (Azure Blob Storage — teacher photos, avatars) and `picsum.photos` (dev seed placeholder images) — see DDL in `data-model.md §6`
- [ ] T036 [P] [US6] Add `priority` prop to the first `<Image>` in the events grid (above-fold EventCard image) and add explicit `sizes` attribute matching the grid breakpoints in `apps/web/src/components/events/EventCard.tsx`
- [ ] T037 [P] [US6] Audit teacher card `<Image>` usage and add `sizes` attribute matching teacher grid layout; add `priority` to the first teacher card image in `apps/web/src/app/teachers/page.tsx` (or the TeacherCard component)
- [ ] T038 [P] [US6] Add `priority` to the profile hero avatar `<Image>` (above fold) and verify explicit `sizes` attribute prevents oversized download in `apps/web/src/app/profile/[userId]/page.tsx`

**Checkpoint**: No `remotePatterns` errors in browser console. WebP images served for external URLs. First event card, first teacher card, and profile avatar load with `priority` (not lazy). `sizes` attributes present on all list-page images.

---

## Phase 9: User Story 7 — Bundle Verification (Priority: P3)

**Goal**: Automated bundle size assertion added to CI, confirming initial JS ≤ 200 KB compressed. `react-leaflet` confirmed absent from initial bundle (regression guard). Script reads `.next/build-manifest.json` and fails the build if threshold is exceeded.

**Independent Test**: Run `ANALYZE=true npm run build` in `apps/web/` — HTML bundle report opens (or saves to `.next/analyze/`). Confirm initial JS bar total ≤ 200 KB. Confirm `react-leaflet` / `leaflet` chunk appears only in the dynamic `MapPanel` chunk. Run `node scripts/assert-bundle-size.mjs 200` — exits with code 0.

- [ ] T039 [US7] Create bundle size assertion script that reads `.next/build-manifest.json`, sums sizes of all initial-load JS chunks, and exits with a non-zero code if total compressed size exceeds the threshold argument (default 200 KB) — in `apps/web/scripts/assert-bundle-size.mjs` (≤ 30 lines, no new dependencies)
- [ ] T040 [P] [US7] Add `ANALYZE=true npm run build` step and `node scripts/assert-bundle-size.mjs 200` assertion step to the CI pipeline in `.github/workflows/ci.yml` (add after the existing build step, before deploy)

**Checkpoint**: CI fails if initial JS bundle exceeds 200 KB. `react-leaflet` confirmed not in initial bundle. Bundle analyser report generated on CI.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility audit, quickstart validation, and regression guard for the dynamic import of `react-leaflet`. These tasks span multiple user stories and should run after all previous phases are complete.

- [ ] T041 [P] Audit all new `loading.tsx` and skeleton components for WCAG 2.1 AA compliance: confirm `aria-busy="true"`, `aria-label` (via `t("common.loading")`), minimum 44 × 44 px touch targets on any interactive elements, and correct focus management in `apps/web/src/app/events/loading.tsx`, `apps/web/src/app/teachers/loading.tsx`, `apps/web/src/app/directory/loading.tsx`, `apps/web/src/app/profile/[userId]/loading.tsx`
- [ ] T042 [P] Audit all new `error.tsx` files for WCAG 2.1 AA compliance: confirm `role="alert"` on error container, "Try again" button is keyboard-focusable and has accessible label, colour contrast meets AA (4.5:1) in `apps/web/src/app/error.tsx`, `apps/web/src/app/events/error.tsx`, `apps/web/src/app/teachers/error.tsx`, `apps/web/src/app/directory/error.tsx`, `apps/web/src/app/profile/[userId]/error.tsx`
- [ ] T043 [P] Run the full quickstart.md validation checklist: verify indexes via `pg_indexes` query, run `npx vitest run --workspace=apps/web --testPathPattern="018"` (all 6 test files pass), run `ANALYZE=true npm run build` and confirm bundle ≤ 200 KB and `react-leaflet` not in initial chunk, test skeleton at each route on Slow 3G, test error boundary reset flow on teachers page

**Checkpoint**: All WCAG requirements met. Quickstart validation passes end-to-end. react-leaflet dynamic import regression confirmed absent. All 6 spec-018 test files green.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)       → No dependencies — start immediately
Phase 2 (Foundational)→ No dependencies — can run in parallel with Phase 1
Phase 3 (US1: DB)     → Depends on Phase 1 (migration file must exist for test)
Phase 4 (US2: Cache)  → Depends on Phase 1 (migration runs first); independent of Phase 2
Phase 5 (US3: Skeleton)→ Depends on Phase 2 (i18n keys must be present)
Phase 6 (US4: Errors) → Depends on Phase 2 (i18n keys must be present)
Phase 7 (US5: SSR)    → Depends on Phase 4 (listTeachersCached must exist); Phase 5 (TeacherCardSkeleton for Suspense fallback)
Phase 8 (US6: Images) → Independent of all other phases — can start after Phase 1
Phase 9 (US7: Bundle) → Depends on Phase 7 (SSR conversion affects bundle); best run last
Phase 10 (Polish)     → Depends on Phases 5, 6, 7, 8 being complete
```

### User Story Dependencies

- **US1 (DB Indexes)**: Depends on Phase 1 (migration file). No other story dependencies.
- **US2 (Caching)**: Depends on Phase 1. Independent of US1 test, US3, US4.
- **US3 (Skeleton)**: Depends on Phase 2 (i18n). Independent of US1, US2.
- **US4 (Error Boundaries)**: Depends on Phase 2 (i18n). Independent of US1, US2, US3.
- **US5 (SSR)**: Depends on US2 (T008 — `searchTeachersCached`) and US3 (T013 — `TeacherCardSkeleton` for `<Suspense>` fallback).
- **US6 (Images)**: Independent of all user stories. Can run in parallel with US1–US4.
- **US7 (Bundle)**: Best run after US5 (SSR conversion affects bundle composition).

### Within Each User Story

- i18n keys before skeleton/error components
- Skeleton components before `loading.tsx` route files
- Service functions before route-level cache config
- SSR service call (`searchTeachersCached`) before SSR page conversion

---

## Parallel Opportunities

### Phase 2 (Foundational)
```
# All three i18n files can be edited in parallel (different files):
T003 — es.json translations
T004 — ar.json translations
(T002 — en.json is the reference, do this first)
```

### Phase 5 (US3: Skeleton) — Parallel Windows
```
# Window A — All 4 skeleton components in parallel (different files):
T012 — EventCardSkeleton.tsx
T013 — TeacherCardSkeleton.tsx
T014 — DirectoryCardSkeleton.tsx
T015 — ProfileSkeleton.tsx

# Window B — All route loading.tsx in parallel (after Window A completes):
T017 — events/loading.tsx
T018 — teachers/loading.tsx
T019 — directory/loading.tsx
T020 — profile/[userId]/loading.tsx

# Window C — All 4 RTL tests in parallel (after Window A completes):
T021 — EventCardSkeleton.test.tsx
T022 — TeacherCardSkeleton.test.tsx
T023 — DirectoryCardSkeleton.test.tsx
T024 — ProfileSkeleton.test.tsx
```

### Phase 6 (US4: Error Boundaries) — Parallel Window
```
# After T025 (ErrorBoundary component) — all route error.tsx in parallel:
T027 — events/error.tsx
T028 — teachers/error.tsx
T029 — directory/error.tsx
T030 — profile/[userId]/error.tsx
```

### Cross-Phase Parallelism (after Phases 1 + 2 complete)
```
# Developer A: US1 (T005) + US2 (T006–T011)
# Developer B: US3 (T012–T024)
# Developer C: US4 (T025–T031) + US6 (T035–T038)
```

---

## Implementation Strategy

### MVP First (US1–US4)

1. Complete Phase 1: Setup (migration file — ~10 min)
2. Complete Phase 2: Foundational (i18n keys — ~15 min, fully parallel)
3. Complete Phase 3: US1 — Database Indexes → **Integration test confirms index presence**
4. Complete Phase 4: US2 — Server-Side Caching → **60 s cache active on public list pages**
5. Complete Phase 5: US3 — Skeleton Loading → **Spec 001 T064 closed. Skeleton on all list pages**
6. Complete Phase 6: US4 — Error Boundaries → **Spec 001 T065 closed. Error UI on all list pages**
7. **STOP and VALIDATE**: Run quickstart.md checklist end-to-end

### Incremental Delivery

7. Phase 7 (US5: SSR) → Eliminates client-side data waterfall on teachers + profile pages
8. Phase 8 (US6: Images) → Activates WebP/AVIF for external images; adds priority hints
9. Phase 9 (US7: Bundle) → CI regression guard for bundle size
10. Phase 10 (Polish) → Accessibility audit + final quickstart validation

---

## Summary

| Metric | Value |
|--------|-------|
| **Total tasks** | 43 |
| **Phase 1 (Setup)** | 1 task |
| **Phase 2 (Foundational — i18n)** | 3 tasks |
| **Phase 3 (US1: Database Indexes)** | 1 task |
| **Phase 4 (US2: Server-Side Caching)** | 6 tasks |
| **Phase 5 (US3: Skeleton Loading — Spec 001 T064)** | 13 tasks |
| **Phase 6 (US4: Error Boundaries — Spec 001 T065)** | 7 tasks |
| **Phase 7 (US5: SSR Conversion)** | 3 tasks |
| **Phase 8 (US6: Image Optimisation)** | 4 tasks |
| **Phase 9 (US7: Bundle Verification)** | 2 tasks |
| **Phase 10 (Polish)** | 3 tasks |
| **Tasks marked [P] (parallelisable)** | 25 tasks |
| **MVP scope** | Phases 1–6 (31 tasks, US1–US4) |
| **Suggested MVP milestone** | End of Phase 6 — Spec 001 backlog cleared, indexes + cache + skeleton + errors live |

---

## Notes

- **No new external dependencies** — all optimisations use Next.js / React built-ins (`unstable_cache`, React `cache()`, `loading.tsx`, `error.tsx`) or already-installed packages (`sharp`, `@next/bundle-analyzer`)
- **`Skeleton` and `EmptyState`** from `packages/shared-ui` MUST be reused — do not create new primitives
- **`CONCURRENTLY` in PGlite**: PGlite ignores the `CONCURRENTLY` keyword — `IF NOT EXISTS` guard makes the migration idempotent and safe in both environments
- **`unstable_cache` in development**: caching is disabled in `NODE_ENV=development`; test caching behaviour in production builds
- **SSR conversion constraint**: teachers filter bar and any interactive social actions (follow/block in directory) must stay `"use client"` child components — only data fetching moves server-side
- **Cache keys must never include PII**: `listEventsCached` and `searchTeachersCached` cache only public, unauthenticated data. Authenticated routes (directory, profile write paths) are never persistently cached
- Commit after each task or logical group
- Stop at the Phase 6 checkpoint to validate Spec 001 deferred tasks T064 + T065 independently before proceeding to US5–US7
