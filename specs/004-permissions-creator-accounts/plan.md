# Implementation Plan: Permissions & Creator Accounts

**Branch**: `004-permissions-creator-accounts` | **Date**: 2026-03-15 | **Spec**: [specs/004-permissions-creator-accounts.md](../004-permissions-creator-accounts.md)
**Input**: Feature specification from `/specs/004-permissions-creator-accounts.md`

## Summary

Implement a hierarchical, geographically-scoped permission system with five roles (Global Admin, Country Admin, City Admin, Event Creator, Member) and an unauthenticated Visitor tier. Permission grants are stored as `(user_id, role, scope_type, scope_value)` tuples in PostgreSQL, cached per session for <50ms resolution. The system includes self-service Event Creator role requests with admin approval, Stripe Connect Standard onboarding for creator payment accounts, and full audit logging of all grant/revoke/denied actions. Higher-scope admins implicitly cover lower scopes; multiple grants are evaluated with most-permissive-wins semantics.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14+ (App Router — API routes + React frontend), Zod (validation), Stripe SDK (Connect Standard), next-auth / @auth/core with Microsoft Entra External ID
**Storage**: PostgreSQL (production), PGlite (test isolation)
**Testing**: Vitest (integration tests with PGlite), Playwright (E2E for P0 flows)
**Target Platform**: Azure (App Service or Container Apps), Node.js 20+
**Project Type**: Web application (Next.js fullstack monorepo — frontend + API routes)
**Performance Goals**: Permission checks < 50ms p95; API mutations < 1s p95
**Constraints**: All mutations server-side verified; session-cached grants; at least one Global Admin must always exist
**Scale/Scope**: Multi-city platform; hundreds of Event Creators, handful of admins per country

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | All permission mutations exposed as versioned API routes. TypeScript interfaces in central types file. |
| II. Test-First Development | ✅ PASS | Integration tests with PGlite for every permission service function. E2E tests for P0 flows (US-1, US-2, US-4). |
| III. Privacy & Data Protection | ✅ PASS | PII (user identity) protected in audit logs; no public exposure of admin member lists. GDPR export includes permission grants. |
| IV. Server-Side Authority | ✅ PASS | Permission checks enforced in middleware/service layer on every mutation. Client-side checks are UX convenience only. Zod validation at API boundary. |
| V. UX Consistency | ✅ PASS | Admin panel and creator request forms follow shared design system. Mobile-first, keyboard navigable. |
| VI. Performance Budget | ✅ PASS | Permission grants cached per session; < 50ms check target. API mutations < 1s. No heavy libraries in initial bundle. |
| VII. Simplicity | ✅ PASS | Flat permission_grants table with scope resolution — no complex RBAC framework. Stripe Connect Standard eliminates custom payment flow. |
| VIII. Internationalisation | ✅ PASS | All UI strings through i18n. Role names, scope names, error messages all extracted. |
| IX. Scoped Permissions | ✅ PASS | **Primary spec concern.** Hierarchical geographic scoping. Multiple-grant resolution (most permissive wins). Server-side checks on every mutation. |
| X. Notification Architecture | ✅ PASS | Role request approved/rejected triggers async notification. |
| XI. Resource Ownership | ✅ PASS | Every resource tracks creator. Only owner or scoped admin can modify. Revoked creator's events flagged for admin review. |
| XII. Financial Integrity | ✅ PASS | Stripe Connect Standard — each creator owns their Stripe account. Platform never holds funds. Direct charges with optional application fee. |
| QG-10: Permission Smoke Test | ✅ PASS | Every new mutation endpoint includes a 403 integration test for unauthorised caller. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/004-permissions-creator-accounts/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — entities, relationships, migrations
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — API contracts
│   ├── permissions-api.ts    # Permission CRUD + check endpoints
│   ├── requests-api.ts       # Creator role request endpoints
│   └── payments-api.ts       # Stripe Connect onboarding endpoints
└── tasks.md             # Phase 2 (created by /speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── permissions/
│   │   │   ├── grants/
│   │   │   │   └── route.ts           # GET (list), POST (grant), DELETE (revoke)
│   │   │   ├── check/
│   │   │   │   └── route.ts           # POST — resolve permission for action
│   │   │   └── requests/
│   │   │       ├── route.ts           # GET (list pending), POST (submit request)
│   │   │       └── [id]/
│   │   │           └── route.ts       # PATCH (approve/reject)
│   │   └── payments/
│   │       ├── connect/
│   │       │   └── route.ts           # POST — initiate Stripe Connect OAuth
│   │       ├── callback/
│   │       │   └── route.ts           # GET — Stripe OAuth callback
│   │       └── status/
│   │           └── route.ts           # GET — check onboarding status
│   ├── admin/
│   │   ├── permissions/
│   │   │   └── page.tsx               # Admin panel — manage grants
│   │   └── requests/
│   │       └── page.tsx               # Admin panel — review creator requests
│   └── settings/
│       └── creator/
│           └── page.tsx               # Creator settings — Stripe onboarding
├── lib/
│   ├── permissions/
│   │   ├── types.ts                   # Role, ScopeType, PermissionGrant types
│   │   ├── service.ts                 # Core logic (check, resolve, grant, revoke)
│   │   ├── cache.ts                   # Session-level permission cache
│   │   ├── middleware.ts              # Next.js middleware for enforcement
│   │   ├── hierarchy.ts              # Scope hierarchy resolution
│   │   └── audit.ts                   # Audit log writer
│   ├── requests/
│   │   ├── types.ts                   # PermissionRequest types
│   │   └── service.ts                 # Submit, approve, reject logic
│   └── payments/
│       ├── types.ts                   # CreatorPaymentAccount types
│       └── stripe-connect.ts          # Stripe Connect Standard integration
├── db/
│   └── migrations/
│       └── 004_permissions.sql        # Schema migration
└── types/
    └── permissions.ts                 # Shared API contract types

tests/
├── integration/
│   ├── permissions/
│   │   ├── grant-revoke.test.ts
│   │   ├── scope-hierarchy.test.ts
│   │   ├── multi-grant.test.ts
│   │   ├── permission-check.test.ts
│   │   └── audit-log.test.ts
│   ├── requests/
│   │   ├── request-lifecycle.test.ts
│   │   └── duplicate-request.test.ts
│   └── payments/
│       └── stripe-connect.test.ts
└── e2e/
    ├── creator-request.spec.ts        # US-4 E2E
    ├── scoped-creation.spec.ts        # US-1 E2E
    └── admin-hierarchy.spec.ts        # US-2 E2E
```

**Structure Decision**: Next.js App Router monorepo. Permission logic lives in `src/lib/permissions/` as a service layer consumed by API route handlers. Database migrations in `src/db/migrations/`. Shared contract types in `src/types/`.

## Complexity Tracking

No constitution violations detected. No complexity justifications needed.

---

## Cross-Spec Dependencies

| Dependent Spec | Dependency on 004 | Integration Point |
|----------------|-------------------|-------------------|
| 001 — Event Discovery & RSVP | Permission checks on event/venue creation, RSVP mutations | `checkPermission()` in 001's mutation handlers |
| 002 — Community Social | Member role definition (who can post, follow) | Member grants from 004; 002 checks `role >= Member` |
| 003 — Recurring/Multi-Day | Event creator scope validation on recurring series | `checkPermission('createEvent', scope)` covers recurring |
| 005 — Teacher Profiles | Admin approval workflow pattern | Shared `PermissionRequest` pattern; 005 extends for teacher-specific fields |

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — technology decisions, alternatives | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
