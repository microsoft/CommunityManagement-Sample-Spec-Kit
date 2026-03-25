# Tasks: Platform Improvements & Documentation Gaps

**Input**: Design documents from `/specs/013-platform-improvements/`
**Prerequisites**: spec.md (required)

## Phase 1: Documentation Foundation (US1 — Contributing Guide)

**Goal**: Enable new contributors to onboard quickly

- [X] T001 [US1] Create `CONTRIBUTING.md` at repo root with sections: prerequisites, setup, development workflow, spec-kit process, PR guidelines, quality gates, code conventions
- [X] T002 [US1] Add Codespaces quick-start instructions referencing `.devcontainer/devcontainer.json`
- [X] T003 [US1] Add section on running validation checklist: tokens:build → typecheck → lint → test → build

**Checkpoint**: New contributors have a clear onboarding path

---

## Phase 2: API Documentation (US2)

**Goal**: Document all 80+ API endpoints

- [X] T004 [US2] Create `docs/api-reference.md` with endpoint inventory grouped by domain (events, community, permissions, teachers, payments, etc.)
- [X] T005 [P] [US2] Document Events domain endpoints (15 routes) with method, path, auth requirements, request/response schemas, error codes
- [X] T006 [P] [US2] Document Community domain endpoints (follows, blocks, mutes, threads, reports — 20+ routes)
- [X] T007 [P] [US2] Document Permissions domain endpoints (grants, requests, check — 4 routes)
- [X] T008 [P] [US2] Document Teachers domain endpoints (profiles, certifications, reviews, applications — 14 routes)
- [X] T009 [P] [US2] Document Payments domain endpoints (Stripe Connect, webhooks, bookings, concessions — 12 routes)
- [X] T010 [P] [US2] Document Directory, Profiles, GDPR, and Health endpoints (10+ routes)

**Checkpoint**: Complete API reference available

---

## Phase 3: Database & Testing Docs (US3, US4)

**Goal**: Document data model and testing patterns

- [X] T011 [US3] Create `docs/database.md` with table inventory, entity-relationship descriptions, and migration process
- [X] T012 [US3] Document cross-spec table dependencies (which migrations depend on which)
- [X] T013 [US4] Create `docs/testing.md` with PGlite setup, createTestDb() pattern, mock auth helpers, test file conventions
- [X] T014 [US4] Document integration test patterns (API route testing, ownership checks, 403 verification)
- [X] T015 [US4] Document component test patterns (axe-core accessibility, Storybook integration)

**Checkpoint**: Developers can understand schema and write tests without reading source

---

## Phase 4: E2E Test Infrastructure (US5)

**Goal**: Add Playwright E2E tests for Events Explorer

- [ ] T016 [US5] Install and configure Playwright for Next.js App Router
- [ ] T017 [US5] Create E2E test for calendar panel user journey (Spec 010 T021)
- [ ] T018 [US5] Create E2E test for map interactions (Spec 010 T037)
- [ ] T019 [US5] Create E2E test for location tree journey (Spec 010 T046)
- [ ] T020 [US5] Add Playwright E2E step to CI pipeline

**Checkpoint**: Critical UI journeys covered by E2E tests

---

## Phase 5: Remaining Task Triage (US6)

**Goal**: Triage and resolve remaining unchecked tasks across all specs

- [ ] T021 [US6] Triage Spec 001 remaining 36 tasks — complete, defer with rationale, or remove
- [ ] T022 [US6] Triage Spec 003 remaining 7 tasks — complete or defer
- [ ] T023 [US6] Triage Spec 004 remaining 26 tasks — complete or defer
- [ ] T024 [US6] Triage Spec 005 remaining 9 tasks — complete or defer
- [ ] T025 [US6] Triage Spec 009 remaining 2 tasks — complete or defer
- [ ] T026 [US6] Triage Spec 010 remaining 6 tasks — complete or defer

**Checkpoint**: All spec tasks are either completed or explicitly deferred with rationale

---

## Phase 6: Polish

- [X] T027 Verify README.md accuracy against current codebase state
- [X] T028 Update specs table in README.md if any spec status changes
- [ ] T029 Run full validation checklist (tokens:build → typecheck → lint → test → build)

---

## Dependencies & Execution Order

- **Phase 1**: No dependencies — can start immediately
- **Phase 2**: No dependencies — can run in parallel with Phase 1
- **Phase 3**: No dependencies — can run in parallel with Phases 1–2
- **Phase 4**: Depends on codebase familiarity (Phase 3 recommended first)
- **Phase 5**: Depends on understanding all specs (Phases 1–3 recommended first)
- **Phase 6**: Depends on all other phases
