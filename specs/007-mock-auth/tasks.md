# Tasks: Mock Authentication with Sample Users

**Input**: Design documents from `/specs/007-mock-auth/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/mock-auth-api.ts, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create new files and directories needed for mock auth

- [ ] T001 Create mock user definitions module with all 5 sample users, deterministic UUIDs, slugs, grants, and the `SampleUser`/`SampleGrant` types in src/lib/auth/mock-users.ts
- [ ] T002 [P] Create the dev API route directory structure at src/app/api/dev/mock-user/
- [ ] T003 [P] Create the dev components directory at src/components/dev/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core mock auth infrastructure that MUST be complete before any user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement `isMockAuthEnabled()` utility function in src/lib/auth/mock-users.ts that returns true when `NODE_ENV === 'development'` AND Entra ID credentials (`ENTRA_CLIENT_ID`) are not configured
- [ ] T005 Implement idempotent seed function in src/lib/auth/mock-seed.ts that upserts all sample users into `users` table, inserts geography/city/country reference data, and upserts permission grants into `permission_grants` table using `ON CONFLICT` clauses

**Checkpoint**: Mock user data definitions and seed infrastructure ready — user story implementation can begin

---

## Phase 3: User Story 1 — Developer Runs App Locally Without Entra ID (Priority: P1) 🎯 MVP

**Goal**: A developer clones the repo, runs `npm run dev`, and is automatically signed in as the default sample user (Alice Global) with no Entra ID configuration required. `getServerSession()` returns a valid session.

**Independent Test**: Start the app with `NODE_ENV=development` and no Entra ID credentials. Navigate to any authenticated page — see content as Alice Global instead of 401 errors.

### Implementation for User Story 1

- [ ] T006 [US1] Modify `getServerSession()` in src/lib/auth/session.ts to add a mock auth guard: when `isMockAuthEnabled()` is true, read the active mock user from cookie (`mock-user-id` via `cookies()` from `next/headers`) or fall back to module-level `_mockUserId` state; return `{ userId }` for the active user or `null` for anonymous; default to global-admin UUID when no mock user is set
- [ ] T007 [US1] Add `setMockUser(userId: string | null)` and `getMockUserId()` exports to src/lib/auth/session.ts for module-level mock user state (used by tests and dev seed)
- [ ] T008 [US1] Implement the `GET /api/dev/mock-user/seed` route in src/app/api/dev/mock-user/seed/route.ts that calls the seed function from mock-seed.ts, returns `SeedMockUsersResponse`, and returns 404 in production mode

**Checkpoint**: App runs locally with automatic mock auth. `getServerSession()` returns a valid session for the default user. All existing `requireAuth()` and `withPermission()` middleware works unchanged.

---

## Phase 4: User Story 2 — Developer Switches Between Sample Users (Priority: P1)

**Goal**: A developer uses a floating dev UI component to switch between sample users and immediately sees permission-gated features reflect the new user's access level.

**Independent Test**: Use the user switcher to change from Global Admin to Regular Member. Access an admin-only page — get 403. Switch back to Global Admin — admin page loads.

### Implementation for User Story 2

- [ ] T009 [US2] Implement `POST /api/dev/mock-user` route in src/app/api/dev/mock-user/route.ts that accepts `SetMockUserRequest` (Zod-validated slug), sets the `mock-user-id` cookie to the matching sample user's UUID (or clears it for anonymous), and returns `SetMockUserResponse`; returns 404 in production mode
- [ ] T010 [US2] Implement `GET /api/dev/mock-user` route in src/app/api/dev/mock-user/route.ts that returns `GetMockUserResponse` with active user (read from cookie) and all available sample users; returns 404 in production mode
- [ ] T011 [US2] Create `MockUserSwitcher` Client Component in src/components/dev/MockUserSwitcher.tsx — fixed-position floating panel (bottom-right), displays current user name and role badge, dropdown of all sample users, calls `POST /api/dev/mock-user` on selection, keyboard-navigable
- [ ] T012 [US2] Modify root layout in src/app/layout.tsx to conditionally render `<MockUserSwitcher />` only when `process.env.NODE_ENV === 'development'`

**Checkpoint**: Developer can switch between all sample users via the floating UI. Permission behavior changes immediately reflect the selected user.

---

## Phase 5: User Story 3 — Sample Users Are Seeded with Correct Permission Grants (Priority: P1)

**Goal**: When the app starts in development mode, all sample users and their permission grants are seeded so `checkPermission()` works end-to-end.

**Independent Test**: Start the app in dev mode. Query `users` table — all 5 sample users exist. Query `permission_grants` — admin/creator users have correct grants. `checkPermission()` returns expected results for each user.

### Implementation for User Story 3

- [ ] T013 [US3] Add dev-mode auto-seed logic that calls the seed function from src/lib/auth/mock-seed.ts on app startup in development mode — trigger from src/app/layout.tsx or a server-side initialization path so that the database is seeded before first request
- [ ] T014 [US3] Verify idempotency: ensure the seed function in src/lib/auth/mock-seed.ts handles re-runs gracefully — no duplicate records, no constraint violations, upserts update existing data

**Checkpoint**: Fresh `npm run dev` on empty database has all sample users and grants seeded. `checkPermission()` returns correct results for all permission levels.

---

## Phase 6: User Story 4 — Test Helpers Seed Sample Users into PGlite (Priority: P2)

**Goal**: Test authors use shared helper functions to seed sample users into PGlite, replacing duplicated ad-hoc `createUser()` functions across test files.

**Independent Test**: Import seed helper in a new integration test, call it with PGlite database, verify all sample users and grants exist. Existing tests still pass.

### Implementation for User Story 4

- [ ] T015 [US4] Create shared test helper in tests/helpers/users.ts that re-exports `SAMPLE_USERS` from src/lib/auth/mock-users.ts, and exports `seedSampleUsers(db: PGlite)` and `seedSampleUser(db: PGlite, slug: string)` functions that insert users, geography, and permission grants into the test database
- [ ] T016 [US4] Add `setTestDb(db: PGlite)` export to src/lib/auth/mock-seed.ts (or src/lib/auth/session.ts) so that seed and session functions can use the injected PGlite instance in test contexts

**Checkpoint**: All test files can import from `tests/helpers/users.ts` for consistent sample user seeding. No more ad-hoc `createUser()` duplication needed.

---

## Phase 7: User Story 5 — Anonymous/Visitor Testing (Priority: P2)

**Goal**: Developers can test unauthenticated flows by selecting "Anonymous / Visitor" in the user switcher, causing `getServerSession()` to return `null`.

**Independent Test**: Switch to Anonymous in the user switcher. Access a protected route — receive 401. Access a public route — loads normally.

### Implementation for User Story 5

- [ ] T017 [US5] Ensure the `POST /api/dev/mock-user` route in src/app/api/dev/mock-user/route.ts handles the `anonymous` slug by clearing the `mock-user-id` cookie (or setting it to a sentinel value), causing `getServerSession()` to return `null`
- [ ] T018 [US5] Ensure `MockUserSwitcher` in src/components/dev/MockUserSwitcher.tsx includes the "Anonymous / Visitor" option in the dropdown with a distinct visual indicator (no role badge, greyed out)

**Checkpoint**: Switching to Anonymous causes `getServerSession()` to return `null`. Protected routes return 401. Public routes work normally.

---

## Phase 8: User Story 6 — Query Parameter User Switching (Priority: P3)

**Goal**: Developers can switch mock users by appending `?mockUser=<slug>` to any URL, useful for curl/Postman testing and shareable reproduction URLs.

**Independent Test**: Request `GET /api/events?mockUser=global-admin` — response reflects Global Admin permissions. Same request with `?mockUser=regular-member` — see restricted access.

### Implementation for User Story 6

- [ ] T019 [US6] Create mock middleware in src/lib/auth/mock-middleware.ts that checks for `?mockUser=<slug>` query parameter on incoming requests in development mode, sets the `mock-user-id` cookie to the matching user's UUID, and strips the query param via redirect
- [ ] T020 [US6] Create Next.js middleware file at src/middleware.ts (or modify if it exists) to invoke the mock query param handler from src/lib/auth/mock-middleware.ts when in development mode; ensure it is a no-op in production
- [ ] T021 [US6] Handle invalid/unknown slugs in src/lib/auth/mock-middleware.ts by falling back to the default sample user (global-admin) rather than erroring

**Checkpoint**: `?mockUser=<slug>` on any URL switches the active mock user. Works with curl, Postman, and browser. Completely ignored in production.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Production safety, cleanup, and validation

- [ ] T022 [P] Verify production safety: ensure `getServerSession()` guard in src/lib/auth/session.ts is completely inert when `NODE_ENV !== 'development'` — no mock sessions, no cookie reads, no performance impact
- [ ] T023 [P] Verify `MockUserSwitcher` component in src/components/dev/MockUserSwitcher.tsx is tree-shaken from production builds via the conditional import in layout.tsx
- [ ] T024 [P] Verify all dev API routes (src/app/api/dev/mock-user/route.ts and src/app/api/dev/mock-user/seed/route.ts) return 404 in production mode
- [ ] T025 Run quickstart.md validation — follow the developer quick start steps end-to-end and verify the documented workflow matches actual behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (mock-users.ts) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion — core mock auth
- **US2 (Phase 4)**: Depends on Phase 3 (needs `getServerSession()` mock guard working)
- **US3 (Phase 5)**: Depends on Phase 2 (seed function) — can run in parallel with US2
- **US4 (Phase 6)**: Depends on Phase 2 (mock-users.ts + seed function)
- **US5 (Phase 7)**: Depends on Phase 4 (user switcher UI and API route)
- **US6 (Phase 8)**: Depends on Phase 3 (session.ts mock guard)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no other story dependencies
- **US2 (P1)**: Depends on US1 (session.ts guard must be working for switching to have effect)
- **US3 (P1)**: Depends on Foundational only — can run in parallel with US2
- **US4 (P2)**: Depends on Foundational only — can run in parallel with US1/US2/US3
- **US5 (P2)**: Depends on US2 (needs user switcher UI and API route)
- **US6 (P3)**: Depends on US1 (needs session.ts mock guard)

### Within Each User Story

- Models/definitions before services
- Services before API routes
- API routes before UI components
- Core implementation before integration

### Parallel Opportunities

- T002 and T003 can run in parallel (directory creation)
- T004 and T005 can run in parallel after T001 (different files)
- US3 and US2 can run in parallel after US1 is complete
- US4 can start after Phase 2 (independent of other stories)
- US6 can run in parallel with US5 (different files, independent features)
- All Polish tasks (T022–T024) can run in parallel

---

## Parallel Example: After Foundational Phase

```bash
# Stream 1: US1 (core mock auth)
Task T006: Modify getServerSession() in src/lib/auth/session.ts
Task T007: Add setMockUser/getMockUserId to src/lib/auth/session.ts
Task T008: Create seed API route in src/app/api/dev/mock-user/seed/route.ts

# Stream 2 (can start after T001): US4 (test helpers)
Task T015: Create tests/helpers/users.ts
Task T016: Add setTestDb to src/lib/auth/mock-seed.ts
```

## Parallel Example: After US1 Complete

```bash
# Stream 1: US2 (user switching UI)
Task T009: POST /api/dev/mock-user route
Task T010: GET /api/dev/mock-user route
Task T011: MockUserSwitcher component
Task T012: Modify layout.tsx

# Stream 2: US3 (auto-seed on startup)
Task T013: Auto-seed logic on app startup
Task T014: Verify seed idempotency

# Stream 3: US6 (query param switching)
Task T019: Mock middleware for ?mockUser=
Task T020: Next.js middleware integration
Task T021: Invalid slug fallback
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T005)
3. Complete Phase 3: User Story 1 (T006–T008)
4. **STOP and VALIDATE**: `npm run dev` auto-signs in as Alice Global
5. App is usable for development with a single default mock user

### Incremental Delivery

1. Setup + Foundational → Mock user definitions and seed ready
2. Add US1 → Auto mock auth working → **MVP!**
3. Add US2 → Switchable users via floating UI
4. Add US3 → Auto-seed on startup, full permission testing
5. Add US4 → Shared test helpers, consistent test data
6. Add US5 → Anonymous/visitor testing
7. Add US6 → Query param switching for API testing
8. Polish → Production safety verification

### Summary

| Metric | Count |
|--------|-------|
| Total tasks | 25 |
| Phase 1 (Setup) | 3 |
| Phase 2 (Foundational) | 2 |
| US1 tasks | 3 |
| US2 tasks | 4 |
| US3 tasks | 2 |
| US4 tasks | 2 |
| US5 tasks | 2 |
| US6 tasks | 3 |
| Polish tasks | 4 |
| Parallel opportunities | 6 groups |
| MVP scope | Phases 1–3 (T001–T008) |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Mock auth is dev-only — zero production surface area beyond the 3-line guard in `getServerSession()`
