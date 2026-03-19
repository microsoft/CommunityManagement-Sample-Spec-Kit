# Implementation Plan: Community & Social Features

**Branch**: `002-community-social` | **Date**: 2026-03-15 | **Spec**: [specs/002-community-social.md](../002-community-social.md)
**Input**: Feature specification from `/specs/002-community-social/spec.md`

## Summary

Implement the community and social layer: user profiles with home city auto-detection (reusing Spec 001's geolocation snap), per-platform social link visibility (everyone/followers/friends/hidden), unidirectional follow with derived friendship (mutual follows), per-event discussion threads with moderation (edit/delete/pin/lock/reactions), a block/mute/report safety system routed to scoped admins (reusing Spec 004's permission hierarchy), async GDPR data export with 7-day secure download links, and account deletion with message anonymisation preserving thread continuity. All mutations require authenticated Member role (from 004). Admin moderation uses `withPermission()` middleware with geographic scope resolution.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14+ (App Router — API routes + React frontend), Zod (validation), next-auth / @auth/core with Microsoft Entra External ID (from 004)
**Storage**: PostgreSQL (production), PGlite (test isolation)
**Testing**: Vitest (integration tests with PGlite), Playwright (E2E for P0 flows)
**Target Platform**: Azure (App Service or Container Apps), Node.js 20+
**Project Type**: Web application (Next.js fullstack monorepo — frontend + API routes)
**Performance Goals**: Profile load < 500ms; thread message listing < 500ms; API mutations < 1s at p95
**Constraints**: Social link visibility enforced server-side (never leak hidden links); block enforcement symmetric and silent; GDPR export within 30 days; all mutations server-side verified
**Scale/Scope**: Multi-city platform; thousands of users; discussion threads per event (short-form logistics chat, not high-volume messaging)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | All profile, follow, thread, safety, and GDPR operations exposed as versioned API routes. TypeScript interfaces in central contracts (`contracts/` directory). |
| II. Test-First Development | ✅ PASS | Integration tests with PGlite for every service function. E2E tests for P0 flows (US-1 profile setup, US-2 privacy controls, US-5 data export/deletion). |
| III. Privacy & Data Protection | ✅ PASS | **Primary spec concern.** Social link visibility enforced at query time (R-2). Profile API never returns hidden links. GDPR export/deletion fully specified (FR-06, FR-07). Block hides profiles mutually. |
| IV. Server-Side Authority | ✅ PASS | Visibility filtering in service layer. Block/mute enforcement server-side. Zod validation at every API boundary. Content length limits server-enforced. |
| V. UX Consistency | ✅ PASS | Profile setup, thread UI, safety controls follow shared design system. Mobile-first. Keyboard navigable. Loading/error states on all async operations. |
| VI. Performance Budget | ✅ PASS | Profile and thread queries indexed. No heavy libraries. Social link count is bounded (max 4 platforms). Message reactions aggregated in query. |
| VII. Simplicity | ✅ PASS | Flat tables for follows/blocks/mutes (no graph DB). Friend status derived at query time (no materialised view). Reuses 001's geolocation snap and 004's permission middleware. |
| VIII. Internationalisation | ✅ PASS | All UI strings via i18n. Report reasons, visibility labels, and moderation actions all extractable. |
| IX. Scoped Permissions | ✅ PASS | Admin moderation (thread lock, message delete, report review) uses 004's `withPermission()` with geographic scope. Member mutations require authenticated session. |
| X. Notification Architecture | ✅ PASS | Follow notification, report submission confirmation, export-ready notification — all async, distinct types, user-configurable. |
| XI. Resource Ownership | ✅ PASS | Messages owned by author (edit/delete). Profiles owned by user. Reports track reporter. Ownership respected in all mutations. |
| XII. Financial Integrity | N/A | No financial transactions in Spec 002. |
| QG-9: i18n Compliance | ✅ PASS | CI lint ensures no raw string literals in UI components. |
| QG-10: Permission Smoke Test | ✅ PASS | Every mutation endpoint has a 403 integration test for unauthenticated/unauthorised caller. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post–Phase 1 re-check: PASS** — data model, contracts, and source structure all align with principles. Visibility filtering validated against Principle III. Block enforcement validated against FR-09. GDPR deletion sequence validated against FR-07.

## Project Structure

### Documentation (this feature)

```text
specs/002-community-social/
├── plan.md              # This file
├── spec.md              # Feature specification (copied from specs/)
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — entities, relationships, migrations
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — API contracts
│   ├── profiles-api.ts       # Profile CRUD, social links, home city detection
│   ├── follows-api.ts        # Follow/unfollow, followers/following/friends lists
│   ├── threads-api.ts        # Thread messages, reactions, moderation (lock/pin)
│   ├── safety-api.ts         # Block, mute, report CRUD + admin review
│   └── gdpr-api.ts           # Data export, account deletion
└── tasks.md             # Phase 2 (created by /speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── profiles/
│   │   │   ├── me/
│   │   │   │   ├── route.ts               # GET (own profile), PUT (update profile)
│   │   │   │   ├── social-links/
│   │   │   │   │   └── route.ts           # PUT (set social links)
│   │   │   │   └── detect-city/
│   │   │   │       └── route.ts           # POST (auto-detect home city)
│   │   │   └── [userId]/
│   │   │       └── route.ts               # GET (view profile — filtered by relationship)
│   │   ├── follows/
│   │   │   ├── route.ts                   # POST (follow), GET (following list)
│   │   │   ├── [followeeId]/
│   │   │   │   └── route.ts              # DELETE (unfollow)
│   │   │   ├── followers/
│   │   │   │   └── route.ts              # GET (followers list)
│   │   │   └── friends/
│   │   │       └── route.ts              # GET (friends list)
│   │   ├── threads/
│   │   │   ├── by-entity/
│   │   │   │   └── [entityType]/
│   │   │   │       └── [entityId]/
│   │   │   │           └── route.ts       # GET (get thread by entity)
│   │   │   └── [threadId]/
│   │   │       ├── messages/
│   │   │       │   ├── route.ts           # GET (list), POST (create message)
│   │   │       │   └── [messageId]/
│   │   │       │       ├── route.ts       # PATCH (edit), DELETE (delete message)
│   │   │       │       ├── reactions/
│   │   │       │       │   └── route.ts   # POST (toggle reaction)
│   │   │       │       └── pin/
│   │   │       │           └── route.ts   # PATCH (pin/unpin — admin)
│   │   │       └── lock/
│   │   │           └── route.ts           # PATCH (lock/unlock — admin)
│   │   ├── blocks/
│   │   │   ├── route.ts                   # GET (list), POST (block)
│   │   │   └── [blockedId]/
│   │   │       └── route.ts              # DELETE (unblock)
│   │   ├── mutes/
│   │   │   ├── route.ts                   # GET (list), POST (mute)
│   │   │   └── [mutedId]/
│   │   │       └── route.ts              # DELETE (unmute)
│   │   ├── reports/
│   │   │   ├── route.ts                   # GET (admin list), POST (submit report)
│   │   │   └── [id]/
│   │   │       └── route.ts              # PATCH (review — admin)
│   │   └── account/
│   │       ├── route.ts                   # DELETE (delete account)
│   │       ├── export/
│   │       │   └── route.ts              # POST (request export)
│   │       └── exports/
│   │           ├── route.ts              # GET (list exports)
│   │           └── [id]/
│   │               └── download/
│   │                   └── route.ts      # GET (download export file)
│   ├── profile/
│   │   ├── page.tsx                       # Own profile view/edit page
│   │   └── [userId]/
│   │       └── page.tsx                   # Other user's profile page
│   ├── settings/
│   │   ├── privacy/
│   │   │   └── page.tsx                   # Privacy settings (blocks, mutes)
│   │   └── account/
│   │       └── page.tsx                   # Account settings (export, delete)
│   └── events/
│       └── [id]/
│           └── discussion/
│               └── page.tsx               # Event discussion thread page
├── lib/
│   ├── profiles/
│   │   ├── types.ts                       # UserProfile, SocialLink types
│   │   ├── service.ts                     # Profile CRUD, visibility filtering
│   │   └── visibility.ts                  # Social link visibility filter logic
│   ├── follows/
│   │   ├── types.ts                       # Follow types
│   │   ├── service.ts                     # Follow/unfollow, friend detection
│   │   └── relationship.ts               # Compute relationship between two users
│   ├── threads/
│   │   ├── types.ts                       # Thread, Message, Reaction types
│   │   ├── service.ts                     # Message CRUD, moderation actions
│   │   ├── access.ts                      # Thread access check (RSVP-based)
│   │   └── reactions.ts                   # Reaction toggle logic
│   ├── safety/
│   │   ├── types.ts                       # Block, Mute, Report types
│   │   ├── blocks.ts                      # Block/unblock + enforcement helpers
│   │   ├── mutes.ts                       # Mute/unmute
│   │   └── reports.ts                     # Report submission + admin review
│   ├── gdpr/
│   │   ├── types.ts                       # DataExport types, ExportFileSchema
│   │   ├── export.ts                      # Data export assembly logic
│   │   └── deletion.ts                    # Account deletion / anonymisation
│   └── permissions/                       # Reused from 004 (NOT duplicated)
├── db/
│   └── migrations/
│       └── 002_community_social.sql       # Schema migration for this feature
└── types/
    └── community.ts                       # Shared API contract types

tests/
├── integration/
│   ├── profiles/
│   │   ├── profile-crud.test.ts
│   │   ├── social-link-visibility.test.ts
│   │   └── home-city-detection.test.ts
│   ├── follows/
│   │   ├── follow-unfollow.test.ts
│   │   ├── friend-detection.test.ts
│   │   └── follow-block-interaction.test.ts
│   ├── threads/
│   │   ├── message-crud.test.ts
│   │   ├── thread-access.test.ts
│   │   ├── message-reactions.test.ts
│   │   ├── message-edit-history.test.ts
│   │   ├── thread-moderation.test.ts
│   │   └── pin-limit.test.ts
│   ├── safety/
│   │   ├── block-enforcement.test.ts
│   │   ├── block-follow-sever.test.ts
│   │   ├── mute-message-filter.test.ts
│   │   ├── report-submission.test.ts
│   │   └── report-admin-review.test.ts
│   └── gdpr/
│       ├── data-export.test.ts
│       ├── account-deletion.test.ts
│       └── deletion-anonymisation.test.ts
└── e2e/
    ├── profile-setup.spec.ts              # US-1 E2E
    ├── privacy-controls.spec.ts           # US-2 E2E
    └── data-export.spec.ts                # US-5 E2E
```

**Structure Decision**: Next.js App Router monorepo (consistent with Specs 001 + 004). Social/community logic lives in `src/lib/profiles/`, `src/lib/follows/`, `src/lib/threads/`, `src/lib/safety/`, and `src/lib/gdpr/` as service layers consumed by API route handlers. Permission checks reuse `src/lib/permissions/` from Spec 004 — no duplication. Database migrations in `src/db/migrations/`. Shared contract types in `src/types/`.

## Cross-Spec Dependencies

| Spec | Dependency Direction | Integration Point |
|------|---------------------|-------------------|
| 004 — Permissions | 002 depends on 004 | `withPermission()` middleware for admin moderation (thread lock, message delete, report review). Authenticated session (next-auth) for Member-required mutations. Permission hierarchy for report scope routing. |
| 001 — Event Discovery | 002 depends on 001 | `cities` table FK for `user_profiles.home_city_id`. `events` table for thread `entity_id`. `rsvps` table for thread write-access check. Geolocation snap endpoint reused for home city detection. |
| 005 — Teacher Profiles | 005 depends on 002 | Report system from 002 consumed by 005 for review moderation. Thread discussions may be extended for teacher-led sessions. |

### New Permission Actions for 004

Spec 002 introduces new `PermissionAction` values that should be added to Spec 004's permission action enum:

```typescript
// Additions to PermissionAction (in 004's permissions-api.ts)
| 'moderateThread'    // Lock/unlock thread, delete any message, pin message
| 'moderateReports'   // Review and action user reports
```

These actions are checked against the event's city scope (threads) or the reported user's home city scope (reports).

## Complexity Tracking

No constitution violations detected. No complexity justifications needed.

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — technology decisions, alternatives | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
