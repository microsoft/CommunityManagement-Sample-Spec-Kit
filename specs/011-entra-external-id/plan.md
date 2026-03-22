# Implementation Plan: Entra External ID — Social Login Federation

**Branch**: `011-entra-external-id` | **Date**: 2026-03-22 | **Spec**: [specs/011-entra-external-id/spec.md](spec.md)
**Input**: Feature specification from `/specs/011-entra-external-id/spec.md`
**Status**: Draft

## Summary

Replace the current standard Entra ID workforce authentication with Microsoft Entra External ID (CIAM) to enable social logins (Google, Facebook, Apple) for community members. The change updates the NextAuth.js issuer URL from the enterprise `login.microsoftonline.com` format to the CIAM `{tenant}.ciamlogin.com` format, adds user provisioning logic on first social sign-in (inserting/upserting the `users` row from the Entra ID token's `oid` claim), and introduces a new `linked_accounts` table for multi-provider account linking. A new `/login` page with social provider buttons and WCAG 2.1 AA compliance replaces any ad-hoc login UI. Existing `requireAuth()`, `withPermission()`, and all permission checks are unchanged — the `userId` shape and session interface remain identical.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 19, Next.js 16 (App Router)
**Primary Dependencies**: next-auth (Auth.js v5) — existing, already installed. `@auth/core` — existing. No new npm dependencies required.
**Storage**: PostgreSQL (production), PGlite (test isolation). Two SQL migrations added.
**Testing**: Vitest (integration tests with PGlite), Playwright (E2E for P0 sign-in flow)
**Target Platform**: Web (browsers), Azure-hosted
**Project Type**: Web application (Next.js fullstack monorepo — auth + API + frontend)
**Performance Goals**: Sign-in redirect round-trip < 3 s; user provisioning DB write < 100 ms; `getServerSession()` unchanged performance (JWT strategy, no DB call per request)
**Constraints**: No new npm packages. `userId` shape unchanged (UUID from `users.id`). GDPR deletion and export updated. WCAG 2.1 AA on login page. i18n for all login UI strings.
**Scale/Scope**: All community members — every user of the platform. Auth is a critical path.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | Auth is handled by NextAuth route handlers (`/api/auth/[...nextauth]`). New account-linking endpoint (`POST /api/auth/link`) follows API-first pattern. Response types defined in shared types. |
| II. Test-First Development | ✅ PASS | Integration tests for `upsertSocialUser`, `lookupUserByOid`, linked-account conflict detection, and GDPR deletion/export coverage. E2E test for P0 Google sign-in flow. |
| III. Privacy & Data Protection | ✅ PASS | `provider_oid`, `email`, `avatar_url` are PII. GDPR deletion anonymises users and CASCADE-deletes linked_accounts. Export includes social identity fields. Integration test proves GDPR coverage. |
| IV. Server-Side Authority | ✅ PASS | All identity verification happens server-side via Entra External ID token validation. Client never sends its own identity claims. `signIn` callback validates `oid` presence before provisioning. |
| V. UX Consistency | ✅ PASS | Login page uses design tokens. WCAG 2.1 AA. Mobile-first. Loading/error states on sign-in button. Keyboard navigable. |
| VI. Performance Budget | ✅ PASS | JWT session strategy — no DB call per request for session lookup. User provisioning upsert is a single `ON CONFLICT` query. No N+1 patterns introduced. |
| VII. Simplicity | ✅ PASS | No new npm dependencies. Single OIDC provider (Entra External ID). Social providers configured in Azure portal, not in app code. No custom OAuth flows. |
| VIII. Internationalisation | ✅ PASS | All login page strings (button labels, error messages) use i18n keys. No raw string literals in UI components. |
| IX. Scoped Permissions | ✅ PASS | No changes to permission system. New users provisioned with `member` role (no grants). `withPermission()` and `checkPermission()` work identically. |
| X. Notification Architecture | N/A | No notifications in this feature. |
| XI. Resource Ownership | N/A | No new mutable resources with owners. |
| XII. Financial Integrity | N/A | No financial operations. |
| XIII. Development Environment | ✅ PASS | No platform-specific tooling. WSL-compatible. Mock auth (Spec 007) unchanged and still functional for local development. |
| QG-3: Lint | ✅ PASS | All new code follows existing ESLint config. i18n lint passes — no raw strings in UI. |
| QG-10: Permission smoke test | N/A | Auth changes do not introduce new mutation endpoints (account linking is the only new endpoint — 403 test included). |
| QG-11: Auth consistency | ✅ PASS | All routes use `getServerSession()` / `requireAuth()`. Account-linking endpoint uses `requireAuth()`. No client-injectable headers. |
| QG-12: Cross-spec data integrity | ✅ PASS | `linked_accounts` references `users.id` — integration test exercises GDPR deletion cascade. New PII fields covered in deletion and export tests. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post–Phase 1 re-check: PASS** — data model introduces two migrations, no breaking API changes, existing `userId` shape preserved throughout.

## Project Structure

### Documentation (this feature)

```text
specs/011-entra-external-id/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — schema changes, migrations
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — API contracts
│   ├── auth-types.ts         # AuthSession, LinkedAccount, SocialProvider types
│   └── link-account-api.ts   # POST /api/auth/link contract
└── tasks.md             # Phase 2 (created by /speckit.tasks — NOT this command)
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── login/
│   │   └── page.tsx              # NEW — /login page with social sign-in buttons
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/
│       │   │   └── route.ts      # EXISTING — unchanged (handlers export)
│       │   └── link/
│       │       └── route.ts      # NEW — POST /api/auth/link (account linking)
│       └── gdpr/
│           └── delete/
│               └── route.ts      # EXISTING — MODIFIED to cover linked_accounts
├── components/
│   └── auth/
│       ├── LoginButtons.tsx       # NEW — social provider sign-in buttons
│       ├── LinkedAccountsList.tsx # NEW — profile settings: show/remove linked accounts
│       └── auth-messages.ts       # NEW — i18n message keys for auth UI
├── lib/
│   ├── auth/
│   │   ├── config.ts             # EXISTING — MODIFIED: CIAM issuer URL, signIn callback, JWT callback
│   │   ├── session.ts            # EXISTING — unchanged
│   │   └── social-user.ts        # NEW — upsertSocialUser(), lookupUserByOid()
│   └── config.ts                 # EXISTING — MODIFIED: add ENTRA_TENANT_DOMAIN to Zod schema
└── db/
    └── migrations/
        ├── 011-001-add-social-auth-columns.sql   # NEW
        └── 011-002-create-linked-accounts.sql    # NEW

apps/web/tests/
├── integration/
│   ├── social-user.test.ts        # NEW — upsertSocialUser, lookupUserByOid, idempotency
│   ├── link-account.test.ts       # NEW — POST /api/auth/link, 409 conflict, requireAuth
│   └── gdpr-social.test.ts        # NEW — deletion + export coverage for new PII fields
└── e2e/
    └── social-login.spec.ts       # NEW — P0 Google sign-in E2E (staging only)

packages/shared/src/types/
└── auth.ts                        # EXISTING — MODIFIED: add LinkedAccount, SocialProvider types
```

**Structure Decision**: All auth changes are co-located in `apps/web/src/lib/auth/` alongside the existing `config.ts` and `session.ts`. New social-user provisioning logic in `social-user.ts` follows the existing pattern of one-responsibility service files. Login UI goes in `apps/web/src/components/auth/` and the login page in `apps/web/src/app/login/`. Two SQL migrations follow the existing naming convention in `apps/web/src/db/migrations/`.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | | |
