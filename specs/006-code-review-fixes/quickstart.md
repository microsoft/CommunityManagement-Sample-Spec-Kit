# Quickstart: Code Review Remediation

**Spec**: 006 | **Date**: 2026-03-16

---

## Prerequisites

- Node.js 20+
- All dependencies from Specs 001–005 already installed
- Branch `006-code-review-fixes` based off `005-teacher-profiles-reviews`

## Setup

```bash
# 1. Switch to the feature branch
git checkout 006-code-review-fixes

# 2. Install dependencies (from repo root)
npm install

# 3. Verify baseline — all existing tests must pass before changes
npm run test
# Expected: 339 tests passing
```

## Running Tests

```bash
# Full test suite (regression check — run after every phase)
npm run test

# Specific test domains affected by this spec:

# Auth migration tests (Specs 001-003 routes)
npm run test -- tests/integration/events/
npm run test -- tests/integration/venues/
npm run test -- tests/integration/profiles/
npm run test -- tests/integration/follows/
npm run test -- tests/integration/threads/
npm run test -- tests/integration/bookings/

# Ownership check tests
npm run test -- tests/integration/teachers/ownership

# Admin permission tests
npm run test -- tests/integration/teachers/admin

# GDPR deletion tests
npm run test -- tests/integration/gdpr/

# Performance tests (N+1 fixes)
npm run test -- tests/integration/threads/messages
npm run test -- tests/integration/follows/
```

## Key Files

### Auth utilities (DO NOT MODIFY — use as-is)
- `src/lib/auth/middleware.ts` — `requireAuth()` wrapper
- `src/lib/auth/session.ts` — `getServerSession()`

### Permission utilities (DO NOT MODIFY — use as-is)
- `src/lib/permissions/middleware.ts` — `withPermission()`

### Error helpers (DO NOT MODIFY — use as-is)
- `src/lib/errors.ts` — Standard error response helpers

### Files requiring changes

| Category | Files | Change |
|----------|-------|--------|
| Auth migration | ~32 route files across `src/app/api/` | Replace header auth with `requireAuth()` |
| Ownership | `src/app/api/teachers/[id]/route.ts` | Add owner check on PATCH/DELETE |
| Admin perm | 4 admin route files | Wrap with `withPermission('admin')` |
| GDPR | `src/lib/gdpr/deletion.ts` (or equivalent) | Add Spec 005 table deletions |
| N+1 threads | `src/services/messages.ts` (or equivalent) | Batch block + reaction queries |
| N+1 follows | `src/services/follows.ts` (or equivalent) | Batch relationship query |
| Table ref | `src/services/teachers.ts` (or equivalent) | Fix city filter table name |
| Zod photos | `src/app/api/teachers/[id]/photos/route.ts` | Replace typeof with Zod schema |
| ILIKE escape | `src/lib/db/utils.ts` + search services | Add escapeIlike utility |
| Stripe const | `src/lib/payments/constants.ts` + consumers | Extract shared constant |
| Error shapes | Various route files | Replace ad-hoc errors with helpers |

### Test helpers
- `tests/helpers/db.ts` — `createTestDb()` for PGlite isolation
- `tests/helpers/auth.ts` — Authenticated request helper (may need update for session-based auth in tests)

## Development Workflow

```
Phase 1: Auth migration     → run full test suite → commit
Phase 2: Access control      → run full test suite → commit
Phase 3: Data integrity      → run full test suite → commit
Phase 4: Performance         → run full test suite → commit
Phase 5: Quality cleanup     → run full test suite → commit
Phase 6: New tests           → run full test suite → commit
Phase 7: Final regression    → all 339+ tests green → ready for PR
```

Each phase should be committed independently for reviewability.
Run `npm run test` after every phase to catch regressions early.
