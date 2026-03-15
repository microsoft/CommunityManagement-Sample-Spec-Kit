# Implementation Plan: Event Discovery & RSVP

**Branch**: `001-event-discovery-rsvp` | **Date**: 2026-03-15 | **Spec**: [specs/001-event-discovery-rsvp.md](../001-event-discovery-rsvp.md)
**Input**: Feature specification from `/specs/001-event-discovery-rsvp/spec.md`

## Summary

Implement the core event lifecycle: browsable event listings with geolocation-based city filtering, full event detail pages with interactive maps, RSVP with role selection (Base/Flyer/Hybrid) and atomic capacity enforcement, waitlist with auto-promotion, interest tracking, paid event checkout via Stripe Connect (reusing Spec 004's integration), creator-defined refund windows with credit-preferred cancellations, and .ics calendar export. All permission checks delegate to Spec 004's `withPermission()` middleware. Authentication uses the Entra External ID integration already designed in Spec 004.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14+ (App Router — API routes + React frontend), Zod (validation), Stripe SDK (Connect Standard — from 004), next-auth / @auth/core with Microsoft Entra External ID (from 004), ical-generator (.ics files)
**Storage**: PostgreSQL (production), PGlite (test isolation)
**Testing**: Vitest (integration tests with PGlite), Playwright (E2E for P0 flows)
**Target Platform**: Azure (App Service or Container Apps), Node.js 20+
**Project Type**: Web application (Next.js fullstack monorepo — frontend + API routes)
**Performance Goals**: LCP < 2.5s on simulated 3G; API mutations (RSVP, booking) < 1s at p95; TTI < 3.5s
**Constraints**: Atomic capacity enforcement (SELECT FOR UPDATE); map library lazy-loaded; initial JS bundle < 200KB compressed; all mutations server-side verified
**Scale/Scope**: Multi-city platform; hundreds of events, thousands of RSVPs; geolocation snapping to city registry (100km threshold)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | All event/RSVP/venue/city mutations and reads exposed as versioned API routes. TypeScript interfaces in central contracts. |
| II. Test-First Development | ✅ PASS | Integration tests with PGlite for every service function. E2E tests for P0 flows (US-1 through US-4). Coverage thresholds applied. |
| III. Privacy & Data Protection | ✅ PASS | Public event endpoints return aggregate attendee counts. Individual names shown only when user opts in via `nameVisible` on RSVP. No PII leak in browse/search. |
| IV. Server-Side Authority | ✅ PASS | Capacity enforcement atomic (SELECT FOR UPDATE). Price/refund calculations server-side only. Zod validation at every API boundary. Permission checks in middleware (from 004). |
| V. UX Consistency | ✅ PASS | Mobile-first event cards, shared design system tokens. All filters reflected in URL query params (bookmarkable). Loading/error states on every async operation. |
| VI. Performance Budget | ✅ PASS | LCP < 2.5s target. Map library (Leaflet/Mapbox) lazy-loaded. Images served as WebP/AVIF with lazy loading. API mutation < 1s at p95. |
| VII. Simplicity | ✅ PASS | Direct service functions — no repository abstraction. Credits as a simple balance table. Geolocation snap is a Haversine query, not a spatial extension. |
| VIII. Internationalisation | ✅ PASS | All UI strings via i18n. Currency with `Intl.NumberFormat` + ISO 4217. Datetime with `Intl.DateTimeFormat` respecting event timezone. |
| IX. Scoped Permissions | ✅ PASS | Event/venue creation wrapped with `withPermission('createEvent', ...)` from Spec 004. RSVP mutations require authenticated Member role. Browse is public (Visitor). |
| X. Notification Architecture | ✅ PASS | RSVP confirmation, waitlist promotion, event cancellation → distinct notification types. Async queue (not blocking request). |
| XI. Resource Ownership | ✅ PASS | Events and venues track `createdBy`. Only owner or scoped admin can edit/cancel. Creator cancels event → attendees get automatic refund. |
| XII. Financial Integrity | ✅ PASS | Paid event checkout via Stripe Connect Standard (direct charges from 004). Credits server-side computed. Refund eligibility determined server-side by refund window. |
| QG-9: i18n Compliance | ✅ PASS | CI lint ensures no raw string literals in UI components. |
| QG-10: Permission Smoke Test | ✅ PASS | Every new mutation endpoint has a 403 integration test for unauthorised caller. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post–Phase 1 re-check: PASS** — data model, contracts, and source structure all align with principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-event-discovery-rsvp/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — entities, relationships, migrations
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — API contracts
│   ├── events-api.ts         # Event CRUD + listing + filtering + .ics + OG meta
│   ├── rsvp-api.ts           # RSVP + waitlist + interest
│   ├── venues-api.ts         # Venue CRUD
│   ├── cities-api.ts         # City registry + geolocation snap
│   └── credits-api.ts        # Creator-scoped credits
└── tasks.md             # Phase 2 (created by /speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── events/
│   │   │   ├── route.ts                # GET (list/filter), POST (create)
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts            # GET (detail), PATCH (edit), DELETE (cancel)
│   │   │   │   ├── rsvp/
│   │   │   │   │   └── route.ts        # POST (RSVP), DELETE (cancel RSVP)
│   │   │   │   ├── waitlist/
│   │   │   │   │   └── route.ts        # POST (join), DELETE (leave)
│   │   │   │   ├── interest/
│   │   │   │   │   └── route.ts        # POST (toggle)
│   │   │   │   └── ics/
│   │   │   │       └── route.ts        # GET — .ics calendar download
│   │   ├── venues/
│   │   │   ├── route.ts                # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts            # GET (detail), PATCH (edit)
│   │   ├── cities/
│   │   │   ├── route.ts                # GET (list cities)
│   │   │   └── nearest/
│   │   │       └── route.ts            # GET (geolocation snap)
│   │   └── credits/
│   │       └── route.ts                # GET (balance for creator)
│   ├── events/
│   │   ├── page.tsx                    # Events list page (browse/filter)
│   │   └── [id]/
│   │       └── page.tsx                # Event detail page
│   └── layout.tsx
├── lib/
│   ├── events/
│   │   ├── types.ts                    # Event, Venue, RSVP enums & interfaces
│   │   ├── service.ts                  # Event CRUD, listing, filtering
│   │   ├── capacity.ts                 # Atomic capacity check (SELECT FOR UPDATE)
│   │   └── ics.ts                      # .ics file generation
│   ├── rsvp/
│   │   ├── types.ts                    # RSVP, Waitlist, Interest types
│   │   ├── service.ts                  # RSVP create/cancel, waitlist, interest
│   │   └── waitlist.ts                 # Auto-promotion logic
│   ├── venues/
│   │   ├── types.ts
│   │   └── service.ts
│   ├── cities/
│   │   ├── types.ts
│   │   └── service.ts                  # City registry, geolocation snap (Haversine)
│   ├── credits/
│   │   ├── types.ts
│   │   └── service.ts                  # Credit issuance, balance, auto-apply
│   ├── payments/                       # Extends 004's stripe-connect.ts
│   │   └── checkout.ts                 # Event booking checkout (charge + credit apply)
│   └── permissions/                    # Reused from 004 (NOT duplicated)
├── db/
│   └── migrations/
│       └── 001_events.sql              # Schema migration for this feature
└── types/
    └── events.ts                       # Shared API contract types

tests/
├── integration/
│   ├── events/
│   │   ├── create-event.test.ts
│   │   ├── list-filter.test.ts
│   │   ├── event-detail.test.ts
│   │   └── cancel-event.test.ts
│   ├── rsvp/
│   │   ├── rsvp-free.test.ts
│   │   ├── rsvp-paid.test.ts
│   │   ├── capacity-enforcement.test.ts
│   │   ├── cancel-rsvp-refund.test.ts
│   │   └── cancel-rsvp-credit.test.ts
│   ├── waitlist/
│   │   ├── join-waitlist.test.ts
│   │   └── auto-promote.test.ts
│   ├── credits/
│   │   └── credit-lifecycle.test.ts
│   ├── cities/
│   │   └── geolocation-snap.test.ts
│   └── venues/
│       └── venue-crud.test.ts
└── e2e/
    ├── browse-events.spec.ts           # US-1 E2E
    ├── filter-events.spec.ts           # US-2 E2E
    ├── event-detail.spec.ts            # US-3 E2E
    └── rsvp-flow.spec.ts              # US-4 E2E
```

**Structure Decision**: Next.js App Router monorepo (consistent with Spec 004). Event/RSVP logic lives in `src/lib/events/` and `src/lib/rsvp/` as service layers consumed by API route handlers. Permission checks reuse `src/lib/permissions/` from Spec 004 — no duplication. Database migrations in `src/db/migrations/`.

## Cross-Spec Dependencies

| Spec | Dependency Direction | Integration Point |
|------|---------------------|-------------------|
| 004 — Permissions | 001 depends on 004 | `withPermission('createEvent', scope)` on event/venue creation. `withPermission('rsvp', ...)` for RSVP. Auth session from 004's next-auth setup. |
| 003 — Recurring/Multi-Day | 003 extends 001 | 001's Event entity includes `recurrenceRule` (nullable). 003 adds occurrence expansion logic. RSVP has `occurrenceDate` (nullable) ready for 003. |
| 005 — Teacher Profiles | 005 extends 001 | 001's Event has no direct teacher FK — 005 adds a junction table `event_teachers`. Event detail page has an extension point for teacher info. |
| 002 — Community Social | Shared entity | 001 and 002 share the City/Country/geography tables (defined in 004's data model). |

## Complexity Tracking

No constitution violations detected. No complexity justifications needed.

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — technology decisions, alternatives | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
