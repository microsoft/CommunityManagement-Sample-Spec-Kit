# Tasks: Code Review Remediation — Security, Data Integrity & Quality Fixes

**Input**: Design documents from `/specs/006-code-review-fixes/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — the spec explicitly requires ≥15 new test cases (FR-019, FR-020) covering ownership, admin permissions, and GDPR deletion.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Due to the remediation nature of this spec, some phases have cross-story dependencies (auth migration must precede all other work).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Test Infrastructure Update)

**Purpose**: Update test helpers to support session-based auth so that all existing 339 tests continue to pass after the auth migration.

- [ ] T001 Update test auth helper to use session-based authentication instead of x-user-id header in tests/helpers/auth.ts
- [ ] T002 Verify all 339 existing tests still pass with updated test helpers by running `npm run test`

**Checkpoint**: Test infrastructure is session-aware. All 339 tests green. Auth migration can now proceed.

---

## Phase 2: Foundational (Auth Migration — Blocks All Stories)

**Purpose**: Replace `x-user-id` header auth with `requireAuth()`/`getServerSession()` across all 32+ routes in Specs 001–003. This is the P0 security fix that must be complete before any other work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. All routes must use server-verified sessions.

### Spec 001 Routes — Events, Venues, RSVPs, Credits

- [ ] T003 [P] Migrate POST /api/events to requireAuth() in src/app/api/events/route.ts
- [ ] T004 [P] Migrate PATCH /api/events/[id] to requireAuth() in src/app/api/events/[id]/route.ts
- [ ] T005 [P] Migrate DELETE /api/events/[id] to requireAuth() in src/app/api/events/[id]/route.ts
- [ ] T006 [P] Migrate POST /api/events/[id]/rsvp to requireAuth() in src/app/api/events/[id]/rsvp/route.ts
- [ ] T007 [P] Migrate DELETE /api/events/[id]/rsvp to requireAuth() in src/app/api/events/[id]/rsvp/route.ts
- [ ] T008 [P] Migrate GET /api/events/[id]/rsvp/status to requireAuth() in src/app/api/events/[id]/rsvp/status/route.ts
- [ ] T009 [P] Migrate POST /api/venues to requireAuth() in src/app/api/venues/route.ts
- [ ] T010 [P] Migrate PATCH /api/venues/[id] to requireAuth() in src/app/api/venues/[id]/route.ts
- [ ] T011 [P] Migrate DELETE /api/venues/[id] to requireAuth() in src/app/api/venues/[id]/route.ts
- [ ] T012 [P] Migrate GET /api/venues/mine to requireAuth() in src/app/api/venues/mine/route.ts
- [ ] T013 [P] Migrate POST /api/credits/redeem to requireAuth() in src/app/api/credits/redeem/route.ts
- [ ] T014 [P] Migrate GET /api/credits/balance to requireAuth() in src/app/api/credits/balance/route.ts
- [ ] T015 Run test suite for Spec 001 routes: `npm run test -- tests/integration/events/ tests/integration/venues/`

### Spec 002 Routes — Profiles, Follows, Threads, Safety

- [ ] T016 [P] Migrate GET /api/profiles/me to requireAuth() in src/app/api/profiles/me/route.ts
- [ ] T017 [P] Migrate PATCH /api/profiles/me to requireAuth() in src/app/api/profiles/me/route.ts
- [ ] T018 [P] Migrate POST /api/follows to requireAuth() in src/app/api/follows/route.ts
- [ ] T019 [P] Migrate DELETE /api/follows/[id] to requireAuth() in src/app/api/follows/[id]/route.ts
- [ ] T020 [P] Migrate GET /api/follows/followers to requireAuth() in src/app/api/follows/followers/route.ts
- [ ] T021 [P] Migrate GET /api/follows/following to requireAuth() in src/app/api/follows/following/route.ts
- [ ] T022 [P] Migrate POST /api/threads to requireAuth() in src/app/api/threads/route.ts
- [ ] T023 [P] Migrate GET /api/threads to requireAuth() in src/app/api/threads/route.ts
- [ ] T024 [P] Migrate GET /api/threads/[id]/messages to requireAuth() in src/app/api/threads/[id]/messages/route.ts
- [ ] T025 [P] Migrate POST /api/threads/[id]/messages to requireAuth() in src/app/api/threads/[id]/messages/route.ts
- [ ] T026 [P] Migrate POST /api/threads/[id]/messages/[msgId]/reactions to requireAuth() in src/app/api/threads/[id]/messages/[msgId]/reactions/route.ts
- [ ] T027 [P] Migrate POST /api/safety/block to requireAuth() in src/app/api/safety/block/route.ts
- [ ] T028 [P] Migrate DELETE /api/safety/block/[id] to requireAuth() in src/app/api/safety/block/[id]/route.ts
- [ ] T029 [P] Migrate POST /api/safety/report to requireAuth() in src/app/api/safety/report/route.ts
- [ ] T030 Run test suite for Spec 002 routes: `npm run test -- tests/integration/profiles/ tests/integration/follows/ tests/integration/threads/`

### Spec 003 Routes — Bookings, Recurrence

- [ ] T031 [P] Migrate POST /api/bookings to requireAuth() in src/app/api/bookings/route.ts
- [ ] T032 [P] Migrate DELETE /api/bookings/[id] to requireAuth() in src/app/api/bookings/[id]/route.ts
- [ ] T033 [P] Migrate GET /api/bookings/mine to requireAuth() in src/app/api/bookings/mine/route.ts
- [ ] T034 [P] Migrate POST /api/events/[id]/recurrence to requireAuth() in src/app/api/events/[id]/recurrence/route.ts
- [ ] T035 [P] Migrate PATCH /api/events/[id]/recurrence to requireAuth() in src/app/api/events/[id]/recurrence/route.ts
- [ ] T036 Run test suite for Spec 003 routes: `npm run test -- tests/integration/bookings/`

### Final Auth Verification

- [ ] T037 Grep src/ for any remaining x-user-id header references and remove them
- [ ] T038 Run full test suite to confirm all 339 tests pass: `npm run test`

**Checkpoint**: All 32+ routes use server-verified sessions. Zero x-user-id references remain. 339 tests green. FR-001, FR-002, FR-003 satisfied.

---

## Phase 3: User Story 2 — Ownership Verification on Teacher Profiles (Priority: P0)

**Goal**: Ensure only profile owners (or admins) can modify or delete teacher profiles.

**Independent Test**: Authenticate as User A, attempt to PATCH or DELETE User B's teacher profile → 403 Forbidden.

### Tests for User Story 2

- [ ] T039 [P] [US2] Write ownership test: non-owner PATCH returns 403 in tests/integration/teachers/ownership.test.ts
- [ ] T040 [P] [US2] Write ownership test: non-owner DELETE returns 403 in tests/integration/teachers/ownership.test.ts
- [ ] T041 [P] [US2] Write ownership test: owner PATCH succeeds in tests/integration/teachers/ownership.test.ts
- [ ] T042 [P] [US2] Write ownership test: admin override PATCH succeeds for non-owner in tests/integration/teachers/ownership.test.ts

### Implementation for User Story 2

- [ ] T043 [US2] Add ownership verification to PATCH handler — load profile, compare user_id to session user, allow admin override in src/app/api/teachers/[id]/route.ts
- [ ] T044 [US2] Add ownership verification to DELETE handler — same pattern as PATCH in src/app/api/teachers/[id]/route.ts
- [ ] T045 [US2] Run ownership tests: `npm run test -- tests/integration/teachers/ownership`

**Checkpoint**: Non-owners get 403 on teacher profile mutations. Owners and admins succeed. FR-004, FR-005 satisfied.

---

## Phase 4: User Story 3 — Admin-Only Access to Privileged Endpoints (Priority: P0)

**Goal**: Restrict 4 privileged endpoints to admin-role users only.

**Independent Test**: Authenticate as non-admin, call any admin endpoint → 403 Forbidden.

### Tests for User Story 3

- [ ] T046 [P] [US3] Write admin test: non-admin PATCH certification verify returns 403 in tests/integration/teachers/admin.test.ts
- [ ] T047 [P] [US3] Write admin test: non-admin PATCH review moderate returns 403 in tests/integration/teachers/admin.test.ts
- [ ] T048 [P] [US3] Write admin test: non-admin GET pending teacher requests returns 403 in tests/integration/teachers/admin.test.ts
- [ ] T049 [P] [US3] Write admin test: non-admin GET expiring certifications returns 403 in tests/integration/teachers/admin.test.ts
- [ ] T050 [P] [US3] Write admin test: admin user succeeds on all 4 endpoints in tests/integration/teachers/admin.test.ts

### Implementation for User Story 3

- [ ] T051 [P] [US3] Wrap PATCH /api/teachers/[id]/certifications/[certId]/verify with withPermission('admin') in src/app/api/teachers/[id]/certifications/[certId]/verify/route.ts
- [ ] T052 [P] [US3] Wrap PATCH /api/reviews/[id]/moderate with withPermission('admin') in src/app/api/reviews/[id]/moderate/route.ts
- [ ] T053 [P] [US3] Wrap GET /api/teachers/requests/pending with withPermission('admin') in src/app/api/teachers/requests/pending/route.ts
- [ ] T054 [P] [US3] Wrap GET /api/teachers/certifications/expiring with withPermission('admin') in src/app/api/teachers/certifications/expiring/route.ts
- [ ] T055 [US3] Run admin tests: `npm run test -- tests/integration/teachers/admin`

**Checkpoint**: All 4 privileged endpoints reject non-admin users with 403. FR-006, FR-007 satisfied.

---

## Phase 5: User Story 4 — Complete GDPR Account Deletion (Priority: P1)

**Goal**: Extend GDPR deletion to cover all Spec 005 tables, ensuring 100% of user data is removed across all 5 specs.

**Independent Test**: Create a user with data in all 5 specs, trigger deletion, verify zero rows remain across all 28 tables.

### Tests for User Story 4

- [ ] T056 [P] [US4] Write GDPR test: user with full Spec 005 data → zero rows after deletion in tests/integration/gdpr/deletion-spec005.test.ts
- [ ] T057 [P] [US4] Write GDPR test: user with no teacher data → deletion completes without error in tests/integration/gdpr/deletion-spec005.test.ts
- [ ] T058 [P] [US4] Write GDPR test: user with partial teacher data → clean deletion in tests/integration/gdpr/deletion-spec005.test.ts

### Implementation for User Story 4

- [ ] T059 [US4] Add 8 deletion steps (orders 21–28) for Spec 005 tables to GDPR deletion function in src/lib/gdpr/deletion.ts — delete review_reminders, reviews (authored), reviews (about user's teacher profile), event_teachers, teacher_photos, certifications, teacher_requests, teacher_profiles in FK order
- [ ] T060 [US4] Run GDPR tests: `npm run test -- tests/integration/gdpr/`

**Checkpoint**: GDPR deletion covers all 28 tables across 5 specs. Existing deletion steps unchanged. FR-008, FR-009, FR-010 satisfied.

---

## Phase 6: User Story 5 — Performant Message Thread Loading (Priority: P1)

**Goal**: Eliminate N+1 queries for block status and reaction summaries when loading thread messages.

**Independent Test**: Load a thread with 50 messages — query count is constant regardless of message count.

### Implementation for User Story 5

- [ ] T061 [US5] Replace per-message isBlocked() with batch query loading all blocked user IDs into a Set in src/services/messages.ts
- [ ] T062 [US5] Replace per-message getReactions() with batch GROUP BY query loading all reaction summaries into a Map in src/services/messages.ts
- [ ] T063 [US5] Decorate messages in-memory using the preloaded Set and Map in src/services/messages.ts
- [ ] T064 [US5] Run thread message tests to verify no regressions: `npm run test -- tests/integration/threads/messages`

**Checkpoint**: Thread loading uses O(1) queries regardless of message count. FR-011, FR-012 satisfied.

---

## Phase 7: User Story 6 — Performant Follower/Following Lists (Priority: P1)

**Goal**: Eliminate N+1 queries for relationship status when loading follower/following lists.

**Independent Test**: Load a follower list at max page size — query count is constant.

### Implementation for User Story 6

- [ ] T065 [US6] Replace per-entry getRelationshipStatus() with batch WHERE IN query loading follow-back set in src/services/follows.ts
- [ ] T066 [US6] Decorate follower/following entries in-memory using the preloaded Set in src/services/follows.ts
- [ ] T067 [US6] Run follower tests to verify no regressions: `npm run test -- tests/integration/follows/`

**Checkpoint**: Follower/following lists use O(1) queries regardless of page size. FR-013 satisfied.

---

## Phase 8: User Story 7 — Correct Teacher Search by City (Priority: P1)

**Goal**: Fix the teacher search city filter to reference the correct table.

**Independent Test**: Search for teachers by city → returns results (or empty set), not a database error.

### Implementation for User Story 7

- [ ] T068 [US7] Fix city filter table reference from wrong table to correct table (user_profiles or teacher_profiles) in src/services/teachers.ts
- [ ] T069 [US7] Run teacher search tests to verify the fix: `npm run test -- tests/integration/teachers/`

**Checkpoint**: Teacher search by city works without runtime errors. FR-014 satisfied.

---

## Phase 9: User Story 8 — Consistent Validation and Error Handling (Priority: P2)

**Goal**: Zod validation for teacher photos, ILIKE wildcard escaping, error response consistency, and Stripe API version constant.

**Independent Test**: Send invalid teacher photo payload → standard error shape. Search with wildcard chars → treated as literals. Stripe version from single constant.

### Implementation for User Story 8

- [ ] T070 [P] [US8] Create escapeIlike() utility function in src/lib/db/utils.ts — escape %, _, and \ in user-supplied search input
- [ ] T071 [P] [US8] Define STRIPE_API_VERSION constant in src/lib/payments/constants.ts
- [ ] T072 [US8] Replace typeof checks with Zod schema (url, alt_text, display_order) in teacher photos POST handler in src/app/api/teachers/[id]/photos/route.ts
- [ ] T073 [US8] Apply escapeIlike() to event search endpoint in src/app/api/events/route.ts
- [ ] T074 [P] [US8] Apply escapeIlike() to venue search endpoint in src/app/api/venues/route.ts
- [ ] T075 [P] [US8] Apply escapeIlike() to teacher search endpoint in src/services/teachers.ts
- [ ] T076 [US8] Update all Stripe API version references to use STRIPE_API_VERSION constant from src/lib/payments/constants.ts
- [ ] T077 [US8] Audit all route files for ad-hoc error responses (NextResponse.json with non-standard shapes) and replace with shared error helpers from src/lib/errors.ts
- [ ] T078 [US8] Run full test suite to confirm quality fixes introduce no regressions: `npm run test`

**Checkpoint**: All validation uses Zod. ILIKE input is escaped. Error shapes are consistent. Stripe version from shared constant. FR-015, FR-016, FR-017, FR-018 satisfied.

---

## Phase 10: Polish & Final Regression

**Purpose**: Final validation confirming all success criteria are met.

- [ ] T079 Run full test suite — all 339+ existing tests and all new tests must pass: `npm run test`
- [ ] T080 Run TypeScript compiler check with zero errors: `tsc --noEmit`
- [ ] T081 Final grep for x-user-id in src/ — confirm zero matches
- [ ] T082 Verify all success criteria SC-001 through SC-010 are met
- [ ] T083 Run quickstart.md validation steps to confirm developer workflow

**Checkpoint**: All success criteria verified. Total test count ≥ 354 (339 baseline + ≥15 new). Zero regressions. Branch ready for PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational / Auth Migration (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US2 Ownership (Phase 3)**: Depends on Phase 2 completion
- **US3 Admin Perms (Phase 4)**: Depends on Phase 2 completion — can run in parallel with Phase 3
- **US4 GDPR (Phase 5)**: Depends on Phase 2 completion — can run in parallel with Phases 3–4
- **US5 Thread Perf (Phase 6)**: Depends on Phase 2 completion — can run in parallel with Phases 3–5
- **US6 Follower Perf (Phase 7)**: Depends on Phase 2 completion — can run in parallel with Phases 3–6
- **US7 City Filter (Phase 8)**: Depends on Phase 2 completion — can run in parallel with Phases 3–7
- **US8 Quality (Phase 9)**: Depends on Phase 2 completion — can run in parallel with Phases 3–8
- **Polish (Phase 10)**: Depends on ALL phases complete

### User Story Independence

- **US2 (Ownership)** and **US3 (Admin)**: Both affect teacher routes — recommend sequential to avoid merge conflicts, but technically independent
- **US4 (GDPR)**: Fully independent of other stories
- **US5 (Thread Perf)** and **US6 (Follower Perf)**: Fully independent of each other and other stories
- **US7 (City Filter)**: Fully independent — one-line fix
- **US8 (Quality)**: Independent but touches many files; best done last to avoid rebase conflicts

### Within Each User Story

- Tests written FIRST, verified to fail
- Implementation follows test guidance
- Verification run confirms tests pass
- Full regression run after each phase commit

### Parallel Opportunities

**After Phase 2 completes**, the following can run in parallel:

```
Phase 3 (US2 Ownership)  ─┐
Phase 4 (US3 Admin)       ─┤
Phase 5 (US4 GDPR)        ─┼── All independent after auth migration
Phase 6 (US5 Thread Perf) ─┤
Phase 7 (US6 Follower Perf)┤
Phase 8 (US7 City Filter)  ┤
Phase 9 (US8 Quality)     ─┘
```

---

## Implementation Strategy

### MVP Scope

The minimum viable delivery is **Phase 1 + Phase 2** (auth migration) — this closes the single largest security vulnerability. The P0 stories (Phases 3–4) should follow immediately.

### Suggested Commit Order

1. **Commit 1**: Phase 1 (test helper update)
2. **Commit 2**: Phase 2 (auth migration — all 32+ routes)
3. **Commit 3**: Phase 3 (ownership checks)
4. **Commit 4**: Phase 4 (admin permission checks)
5. **Commit 5**: Phase 5 (GDPR deletion extension)
6. **Commit 6**: Phases 6–8 (performance fixes + city filter — small, related changes)
7. **Commit 7**: Phase 9 (quality cleanup)
8. **Commit 8**: Phase 10 (final regression verification)

### Incremental Delivery

Each commit produces a **working, regression-free codebase**. The branch can be merged at any commit boundary for partial remediation if needed.
