# Implementation Plan: Teacher Profiles & Reviews

**Branch**: `005-teacher-profiles-reviews` | **Date**: 2026-03-15 | **Spec**: [../005-teacher-profiles-reviews.md](../005-teacher-profiles-reviews.md)
**Input**: Feature specification from `/specs/005-teacher-profiles-reviews.md`

## Summary

Implement teacher profiles as an independent profile attribute (decoupled from Event Creator role), with admin-approved teacher applications, certification tracking with automated expiry transitions, event-teacher assignment, post-event review system (1–5 stars, 14-day window, attendance-verified), aggregate ratings, and GDPR-compliant teacher account deletion with anonymisation. Proof documents stored in Azure Blob Storage with restricted admin-only access. Review moderation reuses Spec 002's Report system. Teacher approval reuses Spec 004's PermissionRequest pattern with teacher-specific fields.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14+ (App Router — API routes + React frontend), Zod (validation), @azure/storage-blob (proof document uploads), next-auth / @auth/core with Microsoft Entra External ID
**Storage**: PostgreSQL (production), PGlite (test isolation), Azure Blob Storage (proof documents)
**Testing**: Vitest (integration tests with PGlite), Playwright (E2E for P0 flows)
**Target Platform**: Azure (App Service or Container Apps), Azure Blob Storage, Node.js 20+
**Project Type**: Web application (Next.js fullstack monorepo — frontend + API routes)
**Performance Goals**: Teacher profile page loads < 2s (SC-01); API mutations < 1s p95; aggregate rating recalculation < 100ms
**Constraints**: Proof documents never in public API responses; one review per attendee per event-teacher pair; 14-day review window; teacher deletion anonymises but retains community reviews
**Scale/Scope**: Hundreds of teachers, thousands of reviews; multi-city platform

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | All teacher/review mutations exposed as versioned API routes. TypeScript interfaces in central types file. Contracts defined before UI. |
| II. Test-First Development | ✅ PASS | Integration tests with PGlite for every service function. E2E tests for P0 flows (US-1 teacher profile, US-2 approval flow). Coverage thresholds met. |
| III. Privacy & Data Protection | ✅ PASS | Proof documents restricted — admin-only access, never in public API. Teacher deletion hard-deletes PII/photos/docs per GDPR. EXIF stripped from uploaded photos. Data export includes teacher data. |
| IV. Server-Side Authority | ✅ PASS | Review window, attendance verification, certification expiry all enforced server-side. Zod validation at API boundary. Client checks are UX only. |
| V. UX Consistency | ✅ PASS | Teacher profile, review form, application form follow shared design system. Mobile-first, keyboard navigable. Star rating accessible via keyboard. |
| VI. Performance Budget | ✅ PASS | Profile loads < 2s (SC-01). Aggregate ratings precomputed on profile row. Teacher search with indexed specialty tags. API mutations < 1s. |
| VII. Simplicity | ✅ PASS | Teacher profile is a simple table with FK to users — no complex hierarchy. Reviews are a flat table with unique constraint. Aggregate rating stored on profile (denormalised, updated on write). No premature abstractions. |
| VIII. Internationalisation | ✅ PASS | All UI strings through i18n. Date/time formatting with `Intl.DateTimeFormat` for review timestamps and certification expiry. Specialty tags stored as keys, translated in UI. |
| IX. Scoped Permissions | ✅ PASS | Teacher approval routed to scoped admin (city/country). Admin-only proof document access uses `withPermission()`. Review moderation through scoped admin queue (Spec 002). |
| X. Notification Architecture | ✅ PASS | Certification expiry alerts (30-day teacher, on-expiry admin), insurance expiry alerts, review reminders (day 1, day 10), application approved/rejected — all async, subscribable, distinct notification types. |
| XI. Resource Ownership | ✅ PASS | Teacher profile owned by user. Reviews owned by reviewer. Only owner or scoped admin can modify. Teacher deletion anonymises profile per GDPR rules; reviews remain as community content. |
| XII. Financial Integrity | ⬜ N/A | Spec 005 does not involve monetary transactions. Teachers do not charge through this feature (event pricing handled by Spec 001/003). |
| QG-9: i18n Compliance | ✅ PASS | No raw strings in UI components. CI lint enforced. |
| QG-10: Permission Smoke Test | ✅ PASS | Every mutation endpoint includes 403 integration test. Admin-only routes (approve/reject, view proof docs) tested for unauthorised rejection. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post-Phase 1 re-check: PASS — design artifacts consistent with all principles.**

## Project Structure

### Documentation (this feature)

```text
specs/005-teacher-profiles-reviews/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — entities, relationships, migrations
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — API contracts
│   ├── teachers-api.ts       # Teacher profile CRUD + application
│   ├── reviews-api.ts        # Review CRUD + aggregate rating
│   ├── certifications-api.ts # Certification management + expiry
│   └── teacher-events-api.ts # Event-teacher assignment
└── tasks.md             # Phase 2 (created by /speckit.tasks — NOT this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── teachers/
│   │   │   ├── route.ts                    # GET (list/search teachers)
│   │   │   ├── apply/
│   │   │   │   └── route.ts                # POST — submit teacher application
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts                # GET (profile), PATCH (update bio/specialties)
│   │   │   │   ├── certifications/
│   │   │   │   │   ├── route.ts            # GET (list), POST (add certification)
│   │   │   │   │   └── [certId]/
│   │   │   │   │       └── route.ts        # PATCH (update), DELETE (remove)
│   │   │   │   ├── photos/
│   │   │   │   │   └── route.ts            # GET, POST, DELETE
│   │   │   │   └── reviews/
│   │   │   │       └── route.ts            # GET — reviews for this teacher
│   │   │   └── requests/
│   │   │       ├── route.ts                # GET (admin: list pending)
│   │   │       └── [id]/
│   │   │           └── route.ts            # PATCH (admin: approve/reject)
│   │   ├── events/
│   │   │   └── [id]/
│   │   │       ├── teachers/
│   │   │       │   └── route.ts            # GET/POST/DELETE — assign teachers to event
│   │   │       └── reviews/
│   │   │           └── route.ts            # POST — submit review; GET — event reviews
│   │   └── admin/
│   │       └── certifications/
│   │           └── expiring/
│   │               └── route.ts            # GET — expiring/expired certifications
│   ├── teachers/
│   │   ├── page.tsx                        # Teacher directory / search
│   │   └── [id]/
│   │       └── page.tsx                    # Teacher profile page
│   ├── settings/
│   │   └── teacher/
│   │       └── page.tsx                    # Teacher application + manage own profile
│   └── admin/
│       └── teachers/
│           ├── page.tsx                    # Admin: teacher requests queue
│           └── certifications/
│               └── page.tsx                # Admin: expiring certifications dashboard
├── lib/
│   ├── teachers/
│   │   ├── types.ts                        # TeacherProfile, Certification, etc.
│   │   ├── service.ts                      # Core teacher logic (apply, approve, delete)
│   │   ├── certification-service.ts        # Certification CRUD + expiry transitions
│   │   ├── certification-expiry-job.ts     # Scheduled job: check expiry, send alerts
│   │   └── blob-storage.ts                # Azure Blob Storage: upload/download proof docs
│   ├── reviews/
│   │   ├── types.ts                        # Review types
│   │   ├── service.ts                      # Review CRUD + attendance check + window check
│   │   ├── aggregate.ts                    # Aggregate rating calculation
│   │   └── reminder-job.ts                # Scheduled job: review reminders (day 1, day 10)
│   └── teacher-events/
│       ├── types.ts                        # EventTeacher assignment types
│       └── service.ts                      # Assign/remove teachers from events
├── db/
│   └── migrations/
│       └── 005_teachers_reviews.sql        # Schema migration
└── types/
    ├── teachers.ts                         # Shared API contract types
    └── reviews.ts                          # Shared review contract types

tests/
├── integration/
│   ├── teachers/
│   │   ├── apply-approve.test.ts           # Application lifecycle
│   │   ├── teacher-profile.test.ts         # Profile CRUD
│   │   ├── teacher-deletion.test.ts        # Anonymisation + GDPR
│   │   ├── certification-expiry.test.ts    # Automated status transition
│   │   └── proof-document.test.ts          # Blob upload + restricted access
│   ├── reviews/
│   │   ├── submit-review.test.ts           # Post-event review
│   │   ├── review-window.test.ts           # 14-day window enforcement
│   │   ├── attendance-check.test.ts        # Non-attendee rejection
│   │   ├── aggregate-rating.test.ts        # Rating calculation
│   │   ├── review-moderation.test.ts       # Report → hide flow
│   │   └── review-reminder.test.ts         # Reminder scheduling
│   └── teacher-events/
│       └── assign-teacher.test.ts          # Event-teacher assignment
└── e2e/
    ├── teacher-profile.spec.ts             # US-1 E2E
    └── teacher-approval.spec.ts            # US-2 E2E
```

**Structure Decision**: Next.js App Router monorepo, consistent with Specs 001–004. Teacher logic in `src/lib/teachers/`, review logic in `src/lib/reviews/`, event-teacher assignment in `src/lib/teacher-events/`. Proof documents in Azure Blob Storage via `src/lib/teachers/blob-storage.ts`. Database migration in `src/db/migrations/005_teachers_reviews.sql`.

## Complexity Tracking

No constitution violations detected. No complexity justifications needed.

---

## Cross-Spec Dependencies

| Dependent Spec | Dependency Direction | Integration Point |
|----------------|---------------------|-------------------|
| 004 — Permissions | 005 consumes | `withPermission()` middleware for admin-only routes. `PermissionRequest` pattern reused for teacher applications (adapted with teacher-specific fields). Scoped admin routing for teacher approval. |
| 001 — Events & RSVP | 005 consumes | `rsvps` table queried to verify attendance before allowing review. `events` table for teaching history and review window calculation (event end date). |
| 002 — Community Social | 005 consumes | Report system (`POST /api/reports`) for review moderation. GDPR export pattern extended to include teacher data. `user_profiles` table remains separate — teacher profile is a distinct entity. |
| 003 — Recurring/Multi-Day | 005 consumes | Multi-day event edge case: review window starts from last occurrence date. `occurrence_overrides` consulted for cancelled occurrences. |

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — technology decisions, alternatives | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
