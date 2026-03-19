# Tasks: User Directory

**Input**: Design documents from `/specs/009-user-directory/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Cross-Spec Dependencies**:
- **Spec 002** (Community Social): `user_profiles`, `social_links`, `follows`, `blocks`, `mutes` tables
- **Spec 004** (Permissions): `users` table, `requireAuth()` middleware
- **Spec 005** (Teacher Profiles): `teacher_profiles` table (badge check)

**Downstream Consumers**: None (Spec 009 is a leaf spec)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US8)

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create database migration `src/db/migrations/007_user_directory.sql`: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS directory_visible BOOLEAN NOT NULL DEFAULT false;` plus partial index on `(directory_visible) WHERE directory_visible = true`
- [X] T002 [P] Create shared types in `packages/shared/src/types/directory.ts`: `DirectoryEntry`, `DirectorySearchParams`, `DirectorySearchResponse`, `SetDirectoryVisibilityRequest`, `DirectoryRelationshipFilter`
- [X] T003 [P] Export `directory.ts` types from `packages/shared/src/types/index.ts`
- [X] T004 [P] Create shared Zod schemas in `packages/shared/src/schemas/directory.ts`: `directorySearchSchema`, `setDirectoryVisibilitySchema`
- [X] T005 [P] Export `directory.ts` schemas from `packages/shared/src/schemas/index.ts`
- [X] T006 [P] Create API contracts at `specs/009-user-directory/contracts/directory-api.ts`

---

## Phase 2: Foundational (Service Layer)

- [X] T007 Create directory service `src/lib/directory/service.ts` with `searchDirectory(viewerId, params)` — single SQL query, JOINs, json_agg(), cursor pagination, block enforcement
- [X] T008 [P] Add `setDirectoryVisibility(userId, visible)` to directory service
- [X] T009 [P] Create `src/lib/validation/directory-schemas.ts` re-exporting shared directory schemas

---

## Phase 3: US1 Browse Directory

- [X] T010 [US1] Create `GET /api/directory` route at `src/app/api/directory/route.ts`: requireAuth, validate params with `directorySearchSchema`, call `searchDirectory`, return paginated response
- [X] T011 [US1] Create directory page at `src/app/directory/page.tsx`: client component, fetches `GET /api/directory`, renders member cards in responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- [X] T012 [US1] Add loading skeleton state to directory page
- [X] T013 [US1] Add empty state to directory page: "No members found" message with suggestion
- [X] T014 [US1] Add cursor-based "Load more" pagination to directory page
- [X] T015 [US1] Add member card component showing: avatar, display name, home city, default role badge, verified teacher badge
- [X] T016 [US1] Add 403 guard: unauthenticated users see login prompt when accessing `/directory`
- [X] T017 [P] [US1] Write integration test: `searchDirectory` returns only `directory_visible=true` members

---

## Phase 4: US2 Search and Filter

- [X] T018 [US2] Add text search filter (`q` param) to `searchDirectory` service: ILIKE on `display_name` and `bio`
- [X] T019 [P] [US2] Add city filter (`cityId` param) to `searchDirectory` service
- [X] T020 [P] [US2] Add role filter (`role` param: base/flyer/hybrid) to `searchDirectory` service
- [X] T020a [P] [US2] Add verified teacher filter (`verifiedTeacher` param) to `searchDirectory` service
- [X] T021 [US2] Add search input to directory page UI (debounced, 300ms)
- [X] T022 [P] [US2] Add city filter dropdown to directory page UI
- [X] T023 [P] [US2] Add role filter select to directory page UI
- [X] T024 [P] [US2] Add "Verified Teachers only" toggle to directory page UI
- [X] T025 [P] [US2] Write integration test: search by name returns matching members
- [X] T026 [P] [US2] Write integration test: city filter returns only city members
- [X] T027 [P] [US2] Write integration test: role filter returns only matching role members

---

## Phase 5: US3 Visibility Toggle

- [X] T028 [US3] Create `PATCH /api/directory/visibility` route: requireAuth, validate body with `setDirectoryVisibilitySchema`, call `setDirectoryVisibility`, return `{ visible: boolean }`
- [X] T028a [P] [US3] Add `getDirectoryVisibility(userId)` helper to directory service
- [X] T028b [P] [US3] Create `GET /api/directory/visibility` route: returns current `directory_visible` for the logged-in user
- [X] T029 [US3] Add "Show me in directory" toggle to settings page (or profile settings section)
- [X] T030 [US3] Write integration test: toggling `directory_visible` includes/excludes user from results
- [X] T031 [P] [US3] Write integration test: blocked users are excluded from directory results
- [X] T032 [P] [US3] Write integration test: `directory_visible=false` user never appears
- [X] T033 [P] [US3] Write integration test: PATCH /api/directory/visibility requires auth (401)
- [X] T034 [P] [US3] Write integration test: viewer's own profile is excluded from their directory view
- [X] T035 [P] [US3] Add `directory_visible = false` to GDPR account deletion flow

---

## Phase 6: US4 Relationship Status

- [X] T036 [US4] Include `relationship` field in `DirectoryEntry` (already in single query via LEFT JOIN on follows)
- [X] T037 [US4] Show relationship badge on directory card: "Friends", "Following", "Follower" (none = no badge)
- [X] T038 [P] [US4] Write integration test: relationship field is 'friend' for mutual follows
- [X] T039 [P] [US4] Write integration test: relationship field is 'following' for one-way follow
- [X] T040 [P] [US4] Write integration test: relationship field is 'none' for strangers

---

## Phase 7: US5 Social Icons

- [X] T041 [US5] Social links included in `DirectoryEntry` via json_agg() (already in base query)
- [X] T042 [US5] Filter visible social links per relationship level using `filterSocialLinks()` in the service
- [X] T043 [US5] Show social link icon buttons on member card (Instagram, YouTube, Facebook, website)
- [X] T044 [P] [US5] Write integration test: social links filtered by relationship visibility rules

---

## Phase 8: US6 Relationship Filter

- [X] T045 [US6] Add `relationship` filter param to `directorySearchSchema` and service
- [X] T046 [US6] Add "My Friends / Following / Followers" filter select to directory UI
- [X] T047 [P] [US6] Write integration test: relationship filter returns only matching members

---

## Phase 9: US7 Completeness Indicator

- [X] T048 [US7] Compute `profileCompleteness` score (0–100) in service and include in `DirectoryEntry`
- [X] T049 [US7] Show completeness indicator only on viewer's own card (if present in results)

---

## Phase 10: US8 Proximity Sort

- [X] T050 [US8] Add `sort` param (`name` | `proximity`) to `directorySearchSchema`
- [X] T051 [US8] Implement proximity sort in service: same city → same country → global (ORDER BY CASE)
- [X] T052 [US8] Add "Near me" sort option to directory page UI

---

## Phase 11: Polish

- [X] T053 Ensure all directory page strings are i18n-extractable (no hardcoded user-facing strings)
- [X] T054 [P] A11y pass: all interactive elements have aria-labels; cards have proper heading hierarchy
