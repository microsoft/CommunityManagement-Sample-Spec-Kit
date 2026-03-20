# Implementation Plan: User Directory

**Branch**: `009-user-directory` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-user-directory/spec.md`

## Summary

Implement a searchable, filterable community member directory with opt-in visibility, relationship management, expanded social link platform enum, proximity-based sorting via the geography hierarchy, and a client-side profile completeness indicator. The directory is a read-focused discovery layer built entirely on existing tables from Specs 002, 004, and 005 — requiring only one new column (`directory_visible BOOLEAN DEFAULT false` on `user_profiles`) and an expanded CHECK constraint on `social_links.platform`. A single `GET /api/directory` endpoint handles all search, filter, sort, and pagination via query parameters, with cursor-based pagination and no N+1 queries.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode)
**Primary Dependencies**: Next.js 16 (App Router, React 19), Zod 4 (validation), PGlite (test isolation)
**Storage**: PostgreSQL (production), PGlite (in-memory test isolation via `createTestDb()`)
**Testing**: Vitest 4 + PGlite integration tests, Playwright E2E for P0 flows
**Target Platform**: Node.js 22+, Azure (App Service / Container Apps), npm workspaces monorepo
**Project Type**: Web application (Next.js fullstack monorepo — `apps/web` + `packages/*`)
**Performance Goals**: Directory page load < 2s; `GET /api/directory` < 500ms p95; cursor pagination consistent at 10k+ members
**Constraints**: Cursor-based pagination only (no offset); all filtering/visibility server-side; single SQL query per page (no N+1); WSL for all commands
**Scale/Scope**: 10k+ opted-in members; 8 social platforms; 4 relationship filters; 3 sort modes; geographic proximity via city→country→continent hierarchy

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | `GET /api/directory` with query params defined before UI. `PATCH /api/profiles/me` extended for `directory_visible`. TypeScript interfaces in `packages/shared/src/types/directory.ts`. Error responses use `@/lib/errors` helpers. |
| II. Test-First Development | ✅ PASS | Integration tests with PGlite for directory query (visibility, filters, blocks, pagination, proximity sort). E2E for P0 US-1 (browse) and US-2 (search/filter). `createTestDb()` isolation per test file. |
| III. Privacy & Data Protection | ✅ PASS | `directory_visible` defaults `false` (privacy-first opt-in). Block enforcement is symmetric. Social link visibility filtered server-side per viewer relationship. `directory_visible` included in GDPR export. GDPR deletion clears `directory_visible`. |
| IV. Server-Side Authority | ✅ PASS | All filtering, visibility checks, block exclusion, social link visibility computed server-side. Zod 4 schema validates all query params at API boundary. Client filters are UX hints only. |
| V. UX Consistency | ✅ PASS | `DirectoryCard` and `SocialIcons` components follow shared design system 5-file pattern. Mobile-first layout. Keyboard-navigable filter controls. Loading/error/empty states for all async operations. |
| VI. Performance Budget | ✅ PASS | Single SQL query with JOINs (no N+1). Cursor-based pagination. Indexes on `directory_visible`, `default_role`, `home_city_id`, `display_name`. Proximity sort uses `CASE` expression on pre-indexed geography columns. |
| VII. Simplicity | ✅ PASS | Only 1 new column added. No new tables. Reuses all existing relationship, geography, and teacher infrastructure. Profile completeness is a pure function (not stored). No premature abstractions. |
| VIII. Internationalisation | ✅ PASS | All UI strings (filter labels, empty states, relationship statuses, sort options) via i18n. No raw string literals. |
| IX. Scoped Permissions | ✅ PASS | Directory is read-only for all authenticated members. `directory_visible` toggle on own profile only (ownership check). Admin visibility override not needed (members self-manage). |
| X. Notification Architecture | ⬜ N/A | No notifications introduced in this spec. |
| XI. Resource Ownership | ✅ PASS | `directory_visible` toggle restricted to profile owner. Follow/block actions from directory cards respect existing ownership rules from Spec 002. |
| XII. Financial Integrity | ⬜ N/A | No financial transactions in this spec. |
| QG-9: i18n Compliance | ✅ PASS | CI lint enforces no raw string literals in UI components. |
| QG-10: Permission Smoke Test | ✅ PASS | Integration test proves unauthenticated `GET /api/directory` returns 401. Follow/block mutations from directory cards inherit existing 403/401 tests from Spec 002. |
| QG-11: Auth Consistency | ✅ PASS | `GET /api/directory` uses `requireAuth()` wrapper. No client-injectable headers. |
| QG-12: Cross-spec Data Integrity | ✅ PASS | Directory query joins user_profiles, social_links, follows, blocks, geography, and teacher_profiles — integration test exercises all cross-spec paths with realistic seed data. GDPR deletion test updated to verify `directory_visible` is cleared. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post-Phase 1 re-check: PASS — data model adds only 1 column, contracts define single endpoint, source structure consistent with existing patterns. All principles satisfied.**

## Project Structure

### Documentation (this feature)

```text
specs/009-user-directory/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — schema changes, indexes, migration
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — API contracts
│   └── directory-api.ts      # GET /api/directory + directory_visible toggle
└── tasks.md             # Phase 2 (created by /speckit.tasks — NOT this command)
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── api/
│   │   └── directory/
│   │       └── route.ts                    # GET — directory search/filter/paginate
│   ├── directory/
│   │   └── page.tsx                        # Directory browse page (server component)
│   └── settings/
│       └── profile/
│           └── page.tsx                    # (EXISTING) — add directory_visible toggle
├── lib/
│   └── directory/
│       ├── service.ts                      # Directory query builder, visibility, filters
│       └── completeness.ts                 # Profile completeness calculator (pure fn)
└── components/
    └── directory/
        ├── DirectoryFilters.tsx            # Filter bar (role, location, teacher, relationship, search)
        ├── DirectoryList.tsx               # Paginated card list with infinite scroll
        └── DirectoryVisibilityToggle.tsx   # Opt-in toggle for profile settings

packages/shared/src/types/
└── directory.ts                            # Shared API contract types (DirectoryEntry, query params)

packages/shared-ui/src/
├── DirectoryCard/                          # 5-file pattern
│   ├── DirectoryCard.tsx
│   ├── DirectoryCard.test.tsx
│   ├── DirectoryCard.stories.tsx
│   ├── index.web.tsx
│   └── index.native.tsx
└── SocialIcons/                            # 5-file pattern
    ├── SocialIcons.tsx
    ├── SocialIcons.test.tsx
    ├── SocialIcons.stories.tsx
    ├── index.web.tsx
    └── index.native.tsx

apps/web/tests/
└── integration/
    └── directory/
        ├── directory-listing.test.ts       # Core listing, visibility, pagination
        ├── directory-filters.test.ts       # Role, location, teacher, text search
        ├── directory-relationships.test.ts # Relationship filter, block exclusion
        ├── directory-proximity.test.ts     # Proximity sort, geography tiers
        └── directory-visibility.test.ts    # Opt-in toggle, block override, social link filtering
```

**Structure Decision**: Follows established monorepo conventions. Service logic in `apps/web/src/lib/directory/`. Shared types in `packages/shared/src/types/directory.ts`. Shared UI components in `packages/shared-ui/src/` following the 5-file pattern (component, test, stories, web index, native index). Single API route at `apps/web/src/app/api/directory/route.ts`. Tests in `apps/web/tests/integration/directory/`.

## Cross-Spec Dependencies

| Dependent Spec | Direction | Integration Point |
|----------------|-----------|-------------------|
| 002 — Community Social | 009 consumes | `user_profiles` table (add `directory_visible` column). `social_links` table (expand platform enum). `follows`, `blocks`, `mutes` tables (relationship status, block exclusion). Social link visibility logic reused. |
| 004 — Permissions | 009 consumes | `geography` table (city→country→continent hierarchy for location filters and proximity sort). `users` table (auth FK). |
| 005 — Teacher Profiles | 009 consumes | `teacher_profiles.is_verified` / `badge_status` (verified teacher badge and filter). LEFT JOIN — most users won't have a teacher profile. |

## Complexity Tracking

No constitution violations detected. No complexity justifications needed.

The feature is deliberately simple: one new column, one new endpoint, zero new tables. All complexity lives in the SQL query (multi-filter, multi-sort, cursor pagination with block exclusion) which is tested exhaustively via PGlite.

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — technology decisions, alternatives | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
