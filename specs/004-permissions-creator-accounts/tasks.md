# Tasks: Permissions & Creator Accounts

**Input**: Design documents from `/specs/004-permissions-creator-accounts/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)

## User Story Summary (from spec.md)

| Story | Title | Priority | Description |
|-------|-------|----------|-------------|
| US-1 | Scoped Event Creator | P0 | Creator creates events/venues within their city scope |
| US-2 | Hierarchical Admin | P0 | Country-level admins manage all resources across child scopes |
| US-3 | Creator Payment Account Setup | P1 | Stripe Connect Standard onboarding for creators |
| US-4 | Request Event Creator Role | P0 | Self-service role request with admin approval |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and base configuration

- [ ] T001 Initialize Next.js 14+ project with TypeScript strict mode, App Router, and folder structure per plan.md in `src/`
- [ ] T002 [P] Install and configure core dependencies: `zod`, `next-auth`/`@auth/core`, `stripe`, `pg` (PostgreSQL client), `vitest`, `@electric-sql/pglite` in `package.json`
- [ ] T003 [P] Create environment configuration with validation in `src/lib/config.ts` — load and Zod-validate `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_CLIENT_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`, `NEXTAUTH_URL`
- [ ] T004 [P] Configure Vitest with PGlite test helper: `createTestDb()` factory in `tests/helpers/db.ts` that spins up an isolated PGlite instance per test file and applies migrations
- [ ] T005 [P] Create shared Zod error handling utility in `src/lib/errors.ts` — standardized API error responses (400, 403, 404, 409) with typed error shapes
- [ ] T006 [P] Configure ESLint + Prettier with TypeScript strict rules and i18n lint rule (no raw string literals in UI components) per constitution QG-3 and QG-9

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Auth & Session

- [ ] T007 Configure next-auth v5 with Microsoft Entra External ID provider in `src/app/api/auth/[...nextauth]/route.ts` — session carries `userId` only, no permission claims (R-4)
- [ ] T008 Create `src/lib/auth/session.ts` — `getServerSession()` wrapper that returns typed `{ userId: string }` or null for unauthenticated visitors

### Database & Migrations

- [ ] T009 Create database connection module in `src/lib/db/client.ts` — PostgreSQL client with connection pooling for production, PGlite adapter for tests
- [ ] T010 Create migration runner in `src/lib/db/migrate.ts` and npm script `db:migrate` — reads SQL files from `src/db/migrations/` and applies them in order
- [ ] T011 Create migration `src/db/migrations/001_users.sql` — minimal `users` table (`id uuid PK, email, name, created_at`) required by permission_grants FK references
- [ ] T012 Create migration `src/db/migrations/004_permissions.sql` — all 5 tables (geography, permission_grants, permission_requests, creator_payment_accounts, permission_audit_log) with indexes and constraints per data-model.md

### Geography & Seed Data

- [ ] T013 Create geography seed script `src/db/seeds/geography.ts` and npm script `db:seed:geography` — populate geography table with initial AcroYoga cities (bristol, london, paris, san_francisco, etc.) with country/continent mappings
- [ ] T014 Create initial Global Admin seed script `src/db/seeds/admin.ts` and npm script `db:seed:admin` — accepts `--email` flag, creates user + global_admin grant

### Shared Types & Core Permission Infrastructure

- [ ] T015 Create shared permission types in `src/types/permissions.ts` — `Role`, `ScopeType`, `EffectiveRole`, `Scope`, `PermissionGrant`, `PermissionAction`, `CheckPermissionRequest`, `CheckPermissionResponse` per contracts/permissions-api.ts
- [ ] T016 Create shared request types in `src/types/requests.ts` — `RequestStatus`, `PermissionRequest`, `SubmitRequestBody`, `ReviewRequestBody` per contracts/requests-api.ts
- [ ] T017 Create shared payment types in `src/types/payments.ts` — `CreatorPaymentAccount`, `ConnectInitiateResponse`, `PaymentStatusResponse` per contracts/payments-api.ts
- [ ] T018 Implement scope hierarchy resolver in `src/lib/permissions/hierarchy.ts` — `doesScopeEncompass(grantScope, targetScope)` using geography table lookup (R-2: city → country → continent → global walk)
- [ ] T019 Implement role-capability matrix in `src/lib/permissions/types.ts` — `roleHasCapability(role, action): boolean` mapping per R-3 matrix (Global Admin: all, Country Admin: within country, etc.)
- [ ] T020 Implement permission cache in `src/lib/permissions/cache.ts` — session-level in-memory Map keyed by userId, lazy-loaded on first check, invalidated on grant/revoke (R-1)
- [ ] T021 Implement core permission service in `src/lib/permissions/service.ts` — `checkPermission(userId, action, targetScope)`, `grantPermission()`, `revokePermission()` with most-permissive-wins resolution (R-3)
- [ ] T022 Implement audit log writer in `src/lib/permissions/audit.ts` — `logAuditEvent(action, userId, role, scope, performedBy, metadata)` appending to permission_audit_log table (R-6)
- [ ] T023 Implement `withPermission(action, scopeResolver)` middleware HOF in `src/lib/permissions/middleware.ts` — wraps Next.js route handlers, extracts userId from session, runs permission check, returns 403 + audit log on deny (R-8)
- [ ] T024 Implement `requireAuth()` middleware in `src/lib/auth/middleware.ts` — wraps route handlers, returns 401 if no session, provides `ctx.userId`

**Checkpoint**: Foundation ready — auth, database, migrations, permission check infrastructure, and middleware are all operational. User story implementation can now begin.

---

## Phase 3: User Story 1 — Scoped Event Creator (Priority: P0) 🎯 MVP

**Goal**: An Event Creator granted city scope can create events/venues in their city, is blocked from other cities, and cannot edit other creators' events.

**Independent Test**: Grant a user `event_creator` for `bristol` → POST create event in Bristol succeeds → POST create event in London returns 403 → POST edit another creator's Bristol event returns 403.

### Implementation for User Story 1

- [ ] T025 [US1] Implement grant/revoke service functions in `src/lib/permissions/service.ts` — `grantPermission()` creates row in permission_grants + audit log entry; `revokePermission()` sets revoked_at + audit log; includes global admin protection (R-7: count check with SELECT FOR UPDATE)
- [ ] T026 [US1] Implement POST `/api/permissions/grants` route in `src/app/api/permissions/grants/route.ts` — Zod-validated `CreateGrantRequest`, wrapped with `withPermission('manageGrants', ...)`, calls grantPermission service, returns 201 with grant
- [ ] T027 [US1] Implement GET `/api/permissions/grants` route in `src/app/api/permissions/grants/route.ts` — query params filter by userId/scopeType/scopeValue/includeRevoked, scoped to caller's admin scope
- [ ] T028 [US1] Implement DELETE `/api/permissions/grants` route in `src/app/api/permissions/grants/route.ts` — Zod-validated `RevokeGrantRequest`, wrapped with `withPermission('manageGrants', ...)`, returns 409 if last global admin
- [ ] T029 [US1] Implement POST `/api/permissions/check` route in `src/app/api/permissions/check/route.ts` — Zod-validated `CheckPermissionRequest`, requires auth, returns `{ allowed, matchedGrant, effectiveRole }` (always 200)
- [ ] T030 [US1] Write integration test for grant + revoke lifecycle in `tests/integration/permissions/grant-revoke.test.ts` — grant creator for bristol, verify active, revoke, verify revoked_at set, verify audit log entries
- [ ] T031 [US1] Write integration test for scope hierarchy in `tests/integration/permissions/scope-hierarchy.test.ts` — city grant covers city only; country grant covers all cities in country; global covers all; cross-country denied
- [ ] T032 [US1] Write integration test for multi-grant resolution in `tests/integration/permissions/multi-grant.test.ts` — user with City Admin Bristol + Event Creator Bath: create event Bristol ✅, create event Bath ✅, create event London ❌
- [ ] T033 [US1] Write integration test for permission check in `tests/integration/permissions/permission-check.test.ts` — event creator can create events in scope, cannot edit others' events, member gets denied, visitor gets denied
- [ ] T034 [US1] Write integration test for audit logging in `tests/integration/permissions/audit-log.test.ts` — grant produces audit entry, revoke produces audit entry, denied check produces audit entry with correct metadata
- [ ] T035 [US1] Write 403 smoke tests for all grant/revoke endpoints in `tests/integration/permissions/unauthorized.test.ts` — unauthenticated caller gets 401, member without admin scope gets 403 on grant/revoke (QG-10)

**Checkpoint**: Scoped permission grants work end-to-end. Creators can be assigned city scope. Permission checks enforce scope hierarchy with most-permissive-wins. Audit trail is complete.

---

## Phase 4: User Story 2 — Hierarchical Admin (Priority: P0)

**Goal**: Country-level (and higher) admins can view and manage all resources within their scope. Admin panel shows only in-scope resources.

**Independent Test**: Grant user `country_admin` for `uk` → GET grants filtered to UK shows all UK city grants → user can revoke a Bristol city_admin grant → user cannot manage grants in France.

### Implementation for User Story 2

- [ ] T036 [US2] Implement scope-filtered grant listing in `src/lib/permissions/service.ts` — `listGrantsForScope(callerGrants, filters)` returns only grants the caller's scope covers (Country Admin UK sees all UK grants, not France)
- [ ] T037 [US2] Implement admin panel permissions page in `src/app/admin/permissions/page.tsx` — server component that lists grants within caller's scope, with grant/revoke actions; shows role, scope, user, grantedAt; uses `withPermission('viewAdminPanel', ...)`
- [ ] T038 [US2] Create admin layout in `src/app/admin/layout.tsx` — shared admin navigation, permission gate (redirects non-admins), scope indicator showing current admin's scope level
- [ ] T039 [US2] Write integration test for hierarchical scope filtering in `tests/integration/permissions/scope-hierarchy.test.ts` — Country Admin UK sees Bristol + London grants; does NOT see Paris grants; Global Admin sees all
- [ ] T040 [US2] Write integration test for cross-scope admin rejection in `tests/integration/permissions/scope-hierarchy.test.ts` — Country Admin UK attempts to revoke a France city_admin grant → 403
- [ ] T041 [US2] Write 403 smoke test for admin panel API in `tests/integration/permissions/unauthorized.test.ts` — member accessing admin grant list gets 403; event creator accessing admin panel gets 403

**Checkpoint**: Admin hierarchy works. Higher-scope admins see and manage everything within their scope. Cross-scope access is denied. Admin panel reflects scope boundaries.

---

## Phase 5: User Story 4 — Request Event Creator Role (Priority: P0)

**Goal**: Authenticated members can self-service request the Event Creator role for a city. Admins at the appropriate scope review and approve/reject. Approval auto-creates the permission grant.

**Independent Test**: Member submits request for Bristol → admin for Bristol/UK/Global sees pending request → admin approves → member now has event_creator grant for Bristol → duplicate pending request returns 409.

### Implementation for User Story 4

- [ ] T042 [US4] Implement request service in `src/lib/requests/service.ts` — `submitRequest(userId, scopeValue, message)`: validates city exists in geography, checks no duplicate pending request (409), inserts permission_requests row, audit log entry
- [ ] T043 [US4] Implement request review service in `src/lib/requests/service.ts` — `reviewRequest(requestId, decision, reason, reviewerId)`: validates request is pending (409 if already reviewed), updates status/reviewedBy/reviewedAt; if approved, calls `grantPermission()` to create event_creator grant; audit log entry for both outcomes
- [ ] T044 [US4] Implement POST `/api/permissions/requests` route in `src/app/api/permissions/requests/route.ts` — Zod-validated `SubmitRequestBody`, requires auth (member+), creates request
- [ ] T045 [US4] Implement GET `/api/permissions/requests` route in `src/app/api/permissions/requests/route.ts` — for admins: list pending requests within their scope; for members: list own requests; query params filter by status/scopeValue/userId
- [ ] T046 [US4] Implement PATCH `/api/permissions/requests/:id` route in `src/app/api/permissions/requests/[id]/route.ts` — Zod-validated `ReviewRequestBody`, wrapped with `withPermission('approveRequests', scopeFromRequest)`, updates request status
- [ ] T047 [US4] Implement request types in `src/lib/requests/types.ts` — Zod schemas for `SubmitRequestBody`, `ReviewRequestBody`, `ListRequestsQuery`
- [ ] T048 [US4] Implement admin requests review page in `src/app/admin/requests/page.tsx` — server component listing pending requests within caller's scope, approve/reject actions with reason field
- [ ] T049 [US4] Write integration test for request lifecycle in `tests/integration/requests/request-lifecycle.test.ts` — submit request → verify pending → approve → verify grant created → verify audit trail
- [ ] T050 [US4] Write integration test for request rejection + resubmission in `tests/integration/requests/request-lifecycle.test.ts` — submit → reject with reason → verify reason visible → submit new request for same scope → succeeds
- [ ] T051 [US4] Write integration test for duplicate request in `tests/integration/requests/duplicate-request.test.ts` — submit request → submit again for same scope while pending → 409
- [ ] T052 [US4] Write 403 smoke tests for request endpoints in `tests/integration/requests/unauthorized.test.ts` — unauthenticated user submitting request → 401; member reviewing request → 403; admin outside scope reviewing → 403

**Checkpoint**: Self-service creator request flow works end-to-end. Members request, admins review, approval creates grant automatically. Duplicate and cross-scope protections in place.

---

## Phase 6: User Story 3 — Creator Payment Account Setup (Priority: P1)

**Goal**: Event Creators can connect their Stripe account via Connect Standard OAuth. Platform stores the connected account ID for direct charges with optional application fee.

**Independent Test**: User with event_creator grant → POST /api/payments/connect returns Stripe OAuth redirect URL → simulate callback with test code → creator_payment_accounts row created → GET /api/payments/status shows connected.

### Implementation for User Story 3

- [ ] T053 [US3] Implement Stripe Connect service in `src/lib/payments/stripe-connect.ts` — `initiateConnect(userId)`: generates Stripe OAuth URL with correct scopes and state parameter; `handleCallback(code, userId)`: exchanges code for stripe_user_id, stores in creator_payment_accounts (R-5)
- [ ] T054 [US3] Implement onboarding status check in `src/lib/payments/stripe-connect.ts` — `getPaymentStatus(userId)`: returns connected/onboarding status from creator_payment_accounts
- [ ] T055 [US3] Implement POST `/api/payments/connect` route in `src/app/api/payments/connect/route.ts` — requires event_creator grant (403 if not), checks not already connected (409), returns `{ redirectUrl }` to Stripe OAuth
- [ ] T056 [US3] Implement GET `/api/payments/callback` route in `src/app/api/payments/callback/route.ts` — handles Stripe OAuth redirect: exchanges code for stripe_user_id, stores account, redirects to `/settings/creator?status=success` or `?error=...`
- [ ] T057 [US3] Implement GET `/api/payments/status` route in `src/app/api/payments/status/route.ts` — requires auth, returns `{ connected, onboardingComplete, account }`
- [ ] T058 [US3] Implement Stripe webhook handler for `account.updated` in `src/app/api/payments/webhook/route.ts` — verifies webhook signature, updates `onboarding_complete` flag on creator_payment_accounts when Stripe confirms full onboarding
- [ ] T059 [US3] Implement creator settings page in `src/app/settings/creator/page.tsx` — shows Stripe Connect status, "Connect Stripe Account" button (or connected indicator), onboarding progress; only visible to users with event_creator grant
- [ ] T060 [US3] Write integration test for Stripe Connect flow in `tests/integration/payments/stripe-connect.test.ts` — mock Stripe API: initiate → callback → verify account stored → status check returns connected; test 403 for non-creator; test 409 for already connected
- [ ] T061 [US3] Write 403 smoke tests for payment endpoints in `tests/integration/payments/unauthorized.test.ts` — member (no creator grant) calling connect → 403; unauthenticated calling status → 401

**Checkpoint**: Stripe Connect Standard onboarding works end-to-end. Creators can connect their Stripe account. Platform stores the account ID for use by future booking/payment features in spec 001/003.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T062 [P] Add rate limiting middleware for permission check endpoint in `src/lib/middleware/rate-limit.ts` — mitigates audit log flooding from brute-force permission probing (R-6)
- [ ] T063 [P] Add i18n extraction for all UI strings in admin panel and creator settings pages — role names, scope names, error messages, button labels extracted to translation keys per constitution Principle VIII
- [ ] T064 [P] Add loading states and error states for all admin panel pages (`src/app/admin/permissions/page.tsx`, `src/app/admin/requests/page.tsx`, `src/app/settings/creator/page.tsx`) per constitution Principle V
- [ ] T065 [P] Add keyboard navigation and ARIA labels to admin panel grant/revoke controls and request review form per constitution Principle V (WCAG 2.1 AA)
- [ ] T066 Implement GDPR data export support — include permission_grants, permission_requests, and creator_payment_accounts in user data export (Constitution Principle III)
- [ ] T067 Add OpenAPI / JSDoc documentation for all API route handlers in `src/app/api/permissions/` and `src/app/api/payments/`
- [ ] T068 Run quickstart.md validation — follow all setup steps from `specs/004-permissions-creator-accounts/quickstart.md` end-to-end on a clean environment, verify all commands work, fix any documentation gaps
- [ ] T069 Performance validation — verify permission checks complete in < 50ms p95 with warm cache; measure cold-cache load time; ensure API mutations respond in < 1s p95 (FR-15, Constitution Principle VI)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──→ Phase 2: Foundational ──→ Phase 3+: User Stories ──→ Phase 7: Polish
                         │
                         ├──→ Phase 3: US-1 (Scoped Event Creator) ─── P0
                         ├──→ Phase 4: US-2 (Hierarchical Admin) ───── P0 (depends on US-1 grants)
                         ├──→ Phase 5: US-4 (Request Creator Role) ── P0 (depends on US-1 grants)
                         └──→ Phase 6: US-3 (Payment Account) ─────── P1 (depends on US-1 grants)
```

### User Story Dependencies

- **US-1 (Phase 3)**: FIRST — implements grant/revoke endpoints and permission check API. All other stories depend on grants existing.
- **US-2 (Phase 4)**: Depends on US-1 (needs grants to exist to display/manage in admin panel). Can parallelize with US-4 if US-1 is complete.
- **US-4 (Phase 5)**: Depends on US-1 (approval creates a grant via grantPermission). Can parallelize with US-2 if US-1 is complete.
- **US-3 (Phase 6)**: Depends on US-1 (creator must have event_creator grant to connect Stripe). Can run in parallel with US-2/US-4 if US-1 is complete.

### Within Each User Story

1. Service layer functions first
2. API route handlers second (consume services)
3. UI pages third (consume API)
4. Integration tests (can parallelize with UI if services + routes are done)

### Cross-Spec Dependencies (downstream)

All other specs depend on this spec's outputs:
- **Spec 001** (Events): Uses `withPermission('createEvent', ...)` middleware and `checkPermission()` service
- **Spec 002** (Social): Uses Member role definition, `role >= Member` checks
- **Spec 003** (Recurring): Uses `checkPermission('createEvent', scope)` for recurring series
- **Spec 005** (Teachers): Uses `PermissionRequest` pattern for teacher approval workflow

### Parallel Opportunities

**After Phase 2 completes + Phase 3 (US-1) completes:**
```
    ┌── Phase 4: US-2 (Admin Panel)
    │
US-1 complete ──┼── Phase 5: US-4 (Request Flow)
    │
    └── Phase 6: US-3 (Stripe Connect)
```

All three stories (US-2, US-4, US-3) can proceed in parallel once US-1 grants infrastructure is done.

**Within Phase 2 (Foundational), parallelizable tasks:**
- T007 + T009 (auth config + db client — independent)
- T013 + T014 (geography seed + admin seed — independent after migrations)
- T015 + T016 + T017 (shared types — independent files)
- T018 + T019 + T020 + T022 (hierarchy, capabilities, cache, audit — independent modules)

---

## Implementation Strategy

### MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (US-1)**

With just US-1 complete, the platform has:
- Working auth with Entra External ID
- Permission grant/revoke/check infrastructure
- Scope hierarchy resolution
- Audit logging
- `withPermission()` middleware ready for all other specs to consume

This is the minimum viable foundation that unblocks specs 001, 002, 003, and 005.

### Incremental Delivery

1. **MVP**: US-1 → deploy, unblock other specs
2. **Admin tooling**: US-2 → admin panel for managing grants
3. **Self-service**: US-4 → members can request creator role (reduces admin burden)
4. **Payments**: US-3 → Stripe Connect for creators who charge for events

### Task Count Summary

| Phase | Tasks | Parallelizable |
|-------|-------|---------------|
| Phase 1: Setup | 6 | 5 |
| Phase 2: Foundational | 18 | 12 |
| Phase 3: US-1 | 11 | 0 (sequential service→route→test) |
| Phase 4: US-2 | 6 | 0 |
| Phase 5: US-4 | 11 | 0 |
| Phase 6: US-3 | 9 | 0 |
| Phase 7: Polish | 8 | 5 |
| **Total** | **69** | **22** |
