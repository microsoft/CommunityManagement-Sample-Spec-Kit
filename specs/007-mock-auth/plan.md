# Implementation Plan: Mock Authentication with Sample Users

**Branch**: `007-mock-auth` | **Date**: 2026-03-16 | **Spec**: [specs/007-mock-auth/spec.md](spec.md)
**Input**: Feature specification from `/specs/007-mock-auth/spec.md`

## Summary

Implement a development-mode mock authentication system that conditionally replaces real Entra ID auth with sample user sessions. The system defines 6 sample users covering all permission levels (global admin through anonymous visitor), provides a floating dev UI for switching users, supports query parameter switching for API testing, and offers shared test helpers to eliminate duplicated `createUser()` functions across 6+ test files. Mock auth intercepts `getServerSession()` — the single auth entry point — so all existing `requireAuth()` and `withPermission()` middleware works without modification. The system is completely inert in production.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14+ (App Router), next-auth / @auth/core with Microsoft Entra External ID, Vitest (tests), PGlite (test DB)
**Storage**: PostgreSQL (production), PGlite (test isolation). No new tables — uses existing `users` and `permission_grants` tables.
**Testing**: Vitest (integration tests with PGlite)
**Target Platform**: Development mode only — mock auth produces zero artifacts in production builds
**Project Type**: Web application (Next.js fullstack monorepo)
**Constraints**: Must go through `getServerSession()` (QG-11). No client-injectable headers. Dev UI tree-shaken from production builds.
**Scale/Scope**: 5 sample users with deterministic UUIDs, 4 permission grants, 1 dev-only UI component, 1 dev-only API route, 1 middleware addition, shared test helpers.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | Dev user-switching exposed via `GET/POST /api/dev/mock-user` with typed contracts. Error responses use `@/lib/errors` envelope. |
| II. Test-First Development | ✅ PASS | Integration tests verify all sample users produce correct sessions. Tests verify mock auth is inert in production mode. Shared helpers eliminate duplicated `createUser()`. |
| III. Privacy & Data Protection | ✅ N/A | Mock auth is dev-only. Sample users use fake PII (`alice@example.com`). No real user data involved. |
| IV. Server-Side Authority | ✅ PASS | Mock session is produced server-side in `getServerSession()`. Cookie is set server-side (via API route). No client-side session fabrication. Zod validation on the mock-user API route. |
| V. UX Consistency | ✅ PASS | Floating user switcher is keyboard-navigable. Role badges have sufficient contrast. Component follows existing design tokens. |
| VI. Performance Budget | ✅ N/A | Dev-only feature. No production performance impact. Dev UI component is <5KB. |
| VII. Simplicity | ✅ PASS | Minimal design: one guard in `getServerSession()`, one cookie, one dev component. No new abstractions beyond what's needed. |
| VIII. Internationalisation | ✅ N/A | Dev-only UI — sample user names/roles do not need i18n. |
| IX. Scoped Permissions | ✅ PASS | Sample users and grants are seeded correctly so `checkPermission()` resolves against real grant data. No permission system changes. |
| X. Notification Architecture | ✅ N/A | No notification changes. |
| XI. Resource Ownership | ✅ N/A | No new mutable resources. Sample users are reference data. |
| XII. Financial Integrity | ✅ N/A | No payment/financial changes. |
| QG-10: Permission Smoke Test | ✅ PASS | Integration tests verify that sample member user gets 403 on admin endpoints, and admin user gets 200. |
| QG-11: Auth Consistency | ✅ PASS | Mock auth goes through `getServerSession()` — the same function all routes use. No header-based auth. Cookie is read server-side only to determine _which_ mock user, not to authenticate. |
| QG-12: Cross-spec Data Integrity | ✅ N/A | No new tables. References existing users/permission_grants tables. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post–Phase 1 re-check: PASS** — data model uses existing tables only, contracts are typed, mock auth flows through `getServerSession()`.

## Project Structure

### Documentation (this feature)

```text
specs/007-mock-auth/
├── plan.md              # This file
├── research.md          # Phase 0 — mock auth strategy decisions
├── data-model.md        # Phase 1 — sample user definitions, seed data
├── quickstart.md        # Phase 1 — developer onboarding
├── contracts/
│   └── mock-auth-api.ts # Phase 1 — API contract for dev endpoints
└── tasks.md             # Phase 2 (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── auth/
│       ├── config.ts              # [EXISTING] NextAuth + Entra ID config — UNCHANGED
│       ├── session.ts             # [MODIFIED] Add mock auth guard in getServerSession()
│       ├── middleware.ts          # [EXISTING] requireAuth() — UNCHANGED
│       ├── mock-users.ts          # [NEW] Sample user definitions (IDs, slugs, grants)
│       ├── mock-seed.ts           # [NEW] Idempotent seed: users + grants + geography
│       └── mock-middleware.ts     # [NEW] Query param ?mockUser= handler
├── components/
│   └── dev/
│       └── MockUserSwitcher.tsx   # [NEW] Floating dev-only user switcher
├── app/
│   ├── layout.tsx                 # [MODIFIED] Conditionally render MockUserSwitcher
│   └── api/
│       └── dev/
│           └── mock-user/
│               └── route.ts       # [NEW] GET/POST for user switching (dev only)
└── middleware.ts                   # [MODIFIED] Add mock query param handling (dev only)

tests/
├── helpers/
│   ├── db.ts                      # [EXISTING] createTestDb() — UNCHANGED
│   └── users.ts                   # [NEW] Shared sample user seed helpers
└── integration/
    └── auth/
        ├── mock-session.test.ts   # [NEW] Mock auth produces valid sessions
        ├── mock-switching.test.ts # [NEW] User switching works correctly
        └── mock-production.test.ts# [NEW] Mock auth is inert in production
```

**Structure Decision**: Mock auth logic lives in `src/lib/auth/` alongside the real auth modules. This keeps the auth concern co-located. The `mock-` prefix clearly distinguishes mock files from real auth files. The dev API route uses a `/dev/` path prefix to make it obvious these endpoints are development-only.

## Cross-Spec Dependencies

| Spec | Dependency Direction | Integration Point |
|------|---------------------|-------------------|
| 004 — Permissions | 007 depends on 004 | Uses `permission_grants` table schema, `checkPermission()` service, `withPermission()` middleware. Sample grants match 004's role/scope model. |
| 001 — Events | 007 supports 001 | Sample users enable testing event creation (creator), admin event management (admin users), RSVP (member). Geography seed ensures Bristol/UK exist. |
| 002 — Community Social | 007 supports 002 | Sample users enable testing social features (follow, post, threads) with appropriate permission levels. |
| 005 — Teachers | 007 supports 005 | Sample users enable testing teacher profile creation and review flows. Could extend sample users with a teacher profile in future. |

## Phase 0: Research

**Status**: ✅ Complete — see [research.md](research.md)

| # | Topic | Decision | Reference |
|---|-------|----------|-----------|
| R-1 | Mock auth interception | Guard in `getServerSession()`, module-level + cookie state | research.md §R-1 |
| R-2 | Per-request state | Cookie (`mock-user-id`) for dev server, module-level for tests | research.md §R-2 |
| R-3 | Dev UI architecture | Fixed-position floating panel, Client Component, API route | research.md §R-3 |
| R-4 | Query param switching | Middleware reads `?mockUser=`, sets cookie, redirects | research.md §R-4 |
| R-5 | User ID stability | Deterministic UUIDs with recognizable pattern | research.md §R-5 |
| R-6 | Test helper strategy | `tests/helpers/users.ts` re-exports from `src/lib/auth/mock-users.ts` | research.md §R-6 |

## Phase 1: Design

**Status**: ✅ Complete

### Data Model

See [data-model.md](data-model.md) — No new tables. 5 sample users with deterministic UUIDs, 4 permission grants, inserted into existing `users` and `permission_grants` tables via idempotent upserts.

### Contracts

See [contracts/mock-auth-api.ts](contracts/mock-auth-api.ts) — Types for:
- `SampleUser` / `SampleGrant` — user definition shape
- `GET /api/dev/mock-user` — returns active user + available users list
- `POST /api/dev/mock-user` — sets active user via slug
- `GET /api/dev/mock-user/seed` — triggers idempotent seed

### Architecture

#### Mock Auth Flow (Dev Server)

```
Browser Request
    │
    ▼
┌───────────────────┐   ?mockUser=slug    ┌──────────────────┐
│  Next.js          │ ──────────────────► │ mock-middleware   │
│  Middleware        │                     │ sets cookie       │
│                   │ ◄────────────────── │ redirects         │
└───────┬───────────┘                     └──────────────────┘
        │
        ▼
┌───────────────────┐
│  API Route /      │
│  Server Component │
│                   │
│  calls getServer  │
│  Session()        │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐   mock enabled?    ┌──────────────────┐
│  getServerSession │ ──── YES ────────► │ Read cookie       │
│  (session.ts)     │                     │ mock-user-id      │
│                   │ ◄──────────────── │ Return { userId } │
│                   │                     └──────────────────┘
│                   │
│                   │ ──── NO ──────────► auth() [real Entra]
└───────────────────┘
```

#### Mock Auth Flow (Tests)

```
beforeEach()
    │
    ├── seedSampleUsers(db)   →  INSERT users + grants
    ├── setTestDb(db)          →  Inject PGlite
    └── setMockUser(userId)    →  Set module-level state
        │
        ▼
    test code calls service function
        │
        ▼
    service calls getServerSession()
        │
        ▼
    returns { userId } from module state
        │
        ▼
    checkPermission(userId, ...) resolves from DB grants
```

#### Key Design Decisions

1. **Single interception point**: Only `getServerSession()` is modified. All middleware (`requireAuth`, `withPermission`) and all route handlers work unchanged.

2. **Mock auth activation**: Enabled when `NODE_ENV === 'development'` AND real Entra ID credentials are NOT configured (i.e., `ENTRA_CLIENT_ID` is unset). This means:
   - Fresh clone + `npm run dev` → mock auth active automatically
   - Developer with Entra creds → real auth active, mock auth inactive
   - Production → always inactive regardless of env vars

3. **Cookie name**: `mock-user-id` — stores the sample user's UUID (or empty for anonymous). HttpOnly is not required (dev-only), but it's still a secure cookie practice.

4. **Production safety layers**:
   - `getServerSession()` guard: `if (process.env.NODE_ENV !== 'development') → skip mock`
   - Dev API route: returns 404 in production
   - MockUserSwitcher: conditionally imported in layout, tree-shaken in prod build
   - Middleware mock handling: no-op if not development

### Test Helpers

`tests/helpers/users.ts` exports:

```typescript
import { SAMPLE_USERS, type SampleUser } from "@/lib/auth/mock-users";
import type { PGlite } from "@electric-sql/pglite";

// Re-export for test convenience
export { SAMPLE_USERS };

// Seed all sample users + geography + permission grants into PGlite
export async function seedSampleUsers(db: PGlite): Promise<void>;

// Seed a single user by slug
export async function seedSampleUser(db: PGlite, slug: string): Promise<string>;
```

This replaces the duplicated `createUser()` pattern found in:
- `tests/integration/payments/unauthorized.test.ts`
- `tests/integration/payments/stripe-connect.test.ts`
- `tests/integration/gdpr/export.test.ts`
- `tests/integration/requests/unauthorized.test.ts`
- `tests/integration/requests/request-lifecycle.test.ts`
- `tests/integration/permissions/unauthorized.test.ts`
- `tests/integration/permissions/grant-revoke.test.ts`

## Complexity Tracking

No constitution violations. No exceptions needed. The feature is exclusively dev/test tooling with no production surface area beyond the `getServerSession()` guard (which is a 3-line conditional).

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — mock auth strategy, state management, UI | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
