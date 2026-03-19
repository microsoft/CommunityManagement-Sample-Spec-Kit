# Implementation Plan: Code Review Remediation — Security, Data Integrity & Quality Fixes

**Branch**: `006-code-review-fixes` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-code-review-fixes/spec.md`

## Summary

Fix all critical, major, and minor issues identified in the cross-spec code review to bring the codebase into full compliance with Constitution v1.3.0. This is a remediation-only effort spanning all 5 spec areas: replace spoofable header-based auth with server-verified sessions across 32+ routes (C1), add ownership verification for teacher profile mutations (C2), enforce admin role checks for 4 privileged endpoints (C3), extend GDPR deletion to cover all Spec 005 tables (M1), eliminate N+1 query patterns in thread loading and follower lists (M2/M3), fix the teacher search city filter table reference (M4), and apply quality cleanup (Zod validation for photos, ILIKE escaping, error consistency, Stripe version constant) (Q1–Q4). No new features, dependencies, or architectural changes — only using existing patterns and utilities.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), Zod (validation), next-auth / @auth/core (session auth), @azure/storage-blob (photos)
**Storage**: PostgreSQL (production), PGlite (test isolation via `createTestDb()`)
**Testing**: Vitest (integration tests with PGlite), 339 existing tests as baseline
**Target Platform**: Azure (App Service or Container Apps), Node.js 20+
**Project Type**: Web application (Next.js fullstack monorepo — API routes + React frontend)
**Performance Goals**: Thread loading O(1) queries regardless of message count; follower list loading O(1) queries regardless of page size; API mutations < 1s p95
**Constraints**: Zero test regressions; no new dependencies; no architectural changes; changes span all 5 spec areas on a single branch
**Scale/Scope**: ~32 route files modified for auth migration, 4 admin endpoints hardened, 7 tables added to GDPR deletion, 2 N+1 patterns fixed, ~15+ new tests added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | Error response consistency fix (Q2) brings all routes into compliance. No new endpoints — all changes are to existing API behaviour. |
| II. Test-First Development | ✅ PASS | 339 existing tests as regression baseline. 15+ new tests for ownership, admin, GDPR coverage. |
| III. Privacy & Data Protection | ✅ PASS | GDPR deletion extended to cover all Spec 005 tables (FR-008, FR-009). Integration test proves zero remaining rows. |
| IV. Server-Side Authority | ✅ PASS | Zod validation replaces typeof checks for teacher photos (FR-015). Auth moves from spoofable header to server session. |
| V. UX Consistency | ⬜ N/A | No UI changes in this spec. |
| VI. Performance Budget | ✅ PASS | N+1 patterns eliminated for thread messages (FR-011, FR-012) and follower lists (FR-013). Query count becomes constant. |
| VII. Simplicity | ✅ PASS | All fixes use existing patterns (requireAuth, withPermission, error helpers). No new abstractions. Stripe version extracted to single constant. |
| VIII. Internationalisation | ⬜ N/A | No i18n changes. |
| IX. Scoped Permissions | ✅ PASS | 4 admin endpoints wrapped with withPermission('admin') (FR-006, FR-007). |
| X. Notification Architecture | ⬜ N/A | No notification changes. |
| XI. Resource Ownership | ✅ PASS | Teacher profile PATCH/DELETE gets ownership check (FR-004, FR-005). Pattern matches Spec 001/003 existing implementation. |
| XII. Financial Integrity | ✅ PASS | Stripe API version extracted to shared constant (FR-017). No changes to payment logic. |
| QG-10: Permission Smoke Test | ✅ PASS | New tests prove 403 for non-owners and non-admins. |
| QG-11: Auth Consistency | ✅ PASS | All 32+ routes migrated from x-user-id header to getServerSession()/requireAuth(). |
| QG-12: Cross-spec Data Integrity | ✅ PASS | GDPR deletion covers all 5 specs. Integration test verifies zero rows across all 28 tables. |

**Gate result: PASS — no violations. Proceed to implementation.**

**Post-Phase 1 re-check: PASS — all design artifacts consistent with constitution principles.**

## Project Structure

### Documentation (this feature)

```text
specs/006-code-review-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 — research decisions (R-1 through R-10)
├── data-model.md        # Phase 1 — GDPR deletion scope, query corrections, affected entities
├── quickstart.md        # Phase 1 — developer setup and workflow
├── contracts/           # Phase 1 — change contracts for existing APIs
│   ├── auth-migration.ts       # Auth pattern change across 32+ routes
│   ├── access-control.ts       # Ownership + admin permission contracts
│   ├── gdpr-deletion.ts        # GDPR deletion extension for Spec 005 tables
│   ├── performance-fixes.ts    # Batch-loading contracts (N+1 elimination)
│   └── quality-fixes.ts        # Zod, ILIKE, error consistency, Stripe constant
├── checklists/
│   └── requirements.md  # Spec quality checklist (pre-existing)
└── tasks.md             # Phase 2 (created by /speckit.tasks — NOT this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/                        # ~32 route files modified for auth migration
│       ├── events/                  # Spec 001 routes
│       ├── venues/                  # Spec 001 routes
│       ├── credits/                 # Spec 001 routes
│       ├── profiles/                # Spec 002 routes
│       ├── follows/                 # Spec 002 routes
│       ├── threads/                 # Spec 002 routes (+ N+1 fix)
│       ├── safety/                  # Spec 002 routes
│       ├── bookings/                # Spec 003 routes
│       ├── teachers/                # Spec 005 routes (ownership + admin checks)
│       └── reviews/                 # Spec 005 routes (admin moderation check)
├── lib/
│   ├── auth/
│   │   ├── middleware.ts            # requireAuth() — USED, NOT MODIFIED
│   │   └── session.ts              # getServerSession() — USED, NOT MODIFIED
│   ├── permissions/
│   │   └── middleware.ts            # withPermission() — USED, NOT MODIFIED
│   ├── errors.ts                    # Error helpers — USED, NOT MODIFIED
│   ├── db/
│   │   ├── client.ts               # db() function — USED, NOT MODIFIED
│   │   └── utils.ts                # NEW: escapeIlike() utility
│   ├── gdpr/
│   │   └── deletion.ts             # MODIFIED: add Spec 005 table deletions
│   └── payments/
│       └── constants.ts             # MODIFIED: add STRIPE_API_VERSION constant
├── services/
│   ├── messages.ts                  # MODIFIED: batch block + reaction queries
│   ├── follows.ts                   # MODIFIED: batch relationship query
│   └── teachers.ts                  # MODIFIED: fix city filter table reference

tests/
├── helpers/
│   ├── db.ts                        # createTestDb() — may need session auth update
│   └── auth.ts                      # Authenticated request helpers
├── integration/
│   ├── teachers/
│   │   ├── ownership.test.ts        # NEW: ownership 403 tests
│   │   └── admin.test.ts            # NEW: admin permission 403 tests
│   ├── gdpr/
│   │   └── deletion-spec005.test.ts # NEW: GDPR deletion for Spec 005 tables
│   ├── threads/
│   │   └── messages.test.ts         # MODIFIED: verify batch loading
│   └── follows/
│       └── followers.test.ts        # MODIFIED: verify batch loading
```

**Structure Decision**: Existing Next.js fullstack monorepo structure. No new directories beyond test files for new coverage. All changes are modifications to existing files or additions within the established test directory structure.

## Implementation Phases

### Phase 1: Auth Migration (P0 — Security Critical)

**Goal**: Replace `x-user-id` header auth with `getServerSession()`/`requireAuth()` across all 32+ routes in Specs 001–003.

**Approach**:
1. Update test helpers to use session-based authentication (all existing tests must continue to pass).
2. Migrate each route file: replace header read with `requireAuth()` wrapper or `getServerSession()`.
3. Remove any references to `x-user-id` header across the codebase.
4. Run full test suite after each spec's routes are migrated.

**Key decisions** (from research R-1):
- Use `requireAuth()` wrapper for all routes where auth is mandatory (most routes)
- Use `getServerSession()` directly for routes with optional auth (public endpoints with enhanced data for logged-in users)
- The header must be fully removed — no fallback, no dual-path

**Verification**: Run `npm run test` — all 339 tests must pass. Grep codebase for `x-user-id` — zero matches.

**Requirements covered**: FR-001, FR-002, FR-003

---

### Phase 2: Access Control (P0 — Security)

**Goal**: Add ownership verification for teacher profile mutations and admin permission checks for 4 privileged endpoints.

**Approach**:
1. Add ownership check to teacher profile PATCH and DELETE handlers: load profile, compare `user_id` to session user, allow admin override.
2. Wrap 4 admin endpoints with `withPermission('admin')`.
3. Add new integration tests proving 403 for non-owners and non-admins.

**Key decisions** (from research R-2, R-3):
- Ownership check is inline (not middleware) — matches pattern from Specs 001/003.
- Admin check uses `withPermission()` middleware — matches pattern from Spec 004.

**Verification**: New tests pass. Existing tests pass. Non-owner PATCH/DELETE → 403. Non-admin admin-endpoint → 403.

**Requirements covered**: FR-004, FR-005, FR-006, FR-007

---

### Phase 3: Data Integrity (P1 — Compliance & Correctness)

**Goal**: Extend GDPR deletion for Spec 005 tables, fix teacher search city filter, add ILIKE wildcard escaping.

**Approach**:
1. GDPR: add 8 deletion steps (orders 21–28) to the account deletion function, respecting FK order.
2. Teacher search: fix table reference from wrong table to `teacher_profiles` (or correct alias) in city filter query.
3. ILIKE: create `escapeIlike()` utility and apply it to all search endpoints.

**Key decisions** (from research R-4, R-7, R-8):
- GDPR deletion is explicit per-table (no CASCADE) for precise control.
- ILIKE escaping is a shared utility used in event, venue, and teacher search.

**Verification**: GDPR test with user spanning all 5 specs → zero rows remaining. Teacher search by city → no runtime error. Search for `%test%` → treated as literal text.

**Requirements covered**: FR-008, FR-009, FR-010, FR-014, FR-018

---

### Phase 4: Performance (P1 — N+1 Elimination)

**Goal**: Batch-load block statuses and reaction summaries for thread messages; batch-load relationship statuses for follower/following lists.

**Approach**:
1. Thread messages: replace per-message `isBlocked()` with upfront `Set<blockedUserId>` query. Replace per-message `getReactions()` with batch `GROUP BY` query and `Map<messageId, ReactionSummary[]>`.
2. Follower/following: replace per-entry `getRelationshipStatus()` with batch `WHERE IN` query and `Set<userId>`.

**Key decisions** (from research R-5, R-6):
- In-memory Set/Map decoration after batch query — simpler than JOIN-based approach.
- Empty message/follower list edge case returns empty result without errors.

**Verification**: Existing tests pass. Thread with 50 messages loads with constant query count. Follower list at max page size loads with constant query count.

**Requirements covered**: FR-011, FR-012, FR-013

---

### Phase 5: Quality Cleanup (P2 — Consistency)

**Goal**: Zod validation for teacher photos, error response consistency, Stripe API version constant.

**Approach**:
1. Replace `typeof` checks in teacher photos POST with a Zod schema.
2. Audit all routes for ad-hoc error responses (`NextResponse.json({ message })`); replace with shared error helpers.
3. Extract `STRIPE_API_VERSION` constant to `@/lib/payments/constants.ts`; update all consumers.

**Key decisions** (from research R-9, R-10):
- Zod schema for photos: `url` (z.string().url()), `alt_text` (z.string().max(200).optional()), `display_order` (z.number().int().min(0).optional()).
- Error helper functions: `unauthorizedError()`, `forbiddenError()`, `notFoundError()`, `validationError()`, `serverError()`.

**Verification**: Invalid photo payload → standard error shape. All error responses conform to `{ error, code, details? }`. Stripe version referenced from single constant.

**Requirements covered**: FR-015, FR-016, FR-017

---

### Phase 6: Testing (All new tests)

**Goal**: Add minimum 15 new test cases covering ownership, admin permissions, and GDPR Spec 005 deletion.

**New test files**:
- `tests/integration/teachers/ownership.test.ts` — Ownership 403 tests (non-owner PATCH, non-owner DELETE, owner success, admin override)
- `tests/integration/teachers/admin.test.ts` — Admin permission 403 tests (non-admin on each of 4 endpoints, admin success on each)
- `tests/integration/gdpr/deletion-spec005.test.ts` — GDPR deletion of Spec 005 data (user with teacher profile/certs/photos/reviews/reminders → zero rows after deletion; user with no teacher data → no-op; partial data → clean deletion)

**Test approach**: All tests use PGlite via `createTestDb()` for isolation. Auth via session helpers. Verify response status codes and database state.

**Verification**: All new tests pass. Total test count ≥ 354 (339 baseline + ≥15 new).

**Requirements covered**: FR-019, FR-020

---

### Phase 7: Regression (Final Validation)

**Goal**: Confirm all 339+ existing tests and all new tests pass with zero failures.

**Steps**:
1. Run `npm run test` — full suite.
2. Run `tsc --noEmit` — zero type errors.
3. Grep for `x-user-id` in src/ — zero matches.
4. Verify all success criteria (SC-001 through SC-010).

**Requirements covered**: FR-019 (regression safety)

## Complexity Tracking

> No constitution violations requiring justification. All changes use existing patterns and utilities.
