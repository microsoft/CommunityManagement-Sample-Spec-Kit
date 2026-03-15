# Implementation Plan: Recurring & Multi-Day Events

**Branch**: `003-recurring-multiday` | **Date**: 2026-03-15 | **Spec**: [specs/003-recurring-multiday.md](../003-recurring-multiday.md)
**Input**: Feature specification from `/specs/003-recurring-multiday/spec.md`

## Summary

Implement recurring events with virtual occurrence expansion (RFC 5545 RRULE via `rrule.js`), per-occurrence RSVPs using composite key `(eventId, occurrenceDate)`, single-occurrence overrides (cancel/modify), series-wide edits, event groups (festival/combo/series) with per-ticket-type capacity pools, cross-capacity validation (atomic `SELECT FOR UPDATE`), group ticket booking via Stripe Connect Standard (reusing Spec 004's integration), concession status with admin approval, and atomic combined-pass cancellation following Spec 001's refund policy. DST-safe occurrence expansion stays at the same local time. Configurable expansion horizon (default 12 weeks).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14+ (App Router — API routes + React frontend), Zod (validation), Stripe SDK (Connect Standard — from 004), next-auth / @auth/core with Microsoft Entra External ID (from 004), ical-generator (from 001), `rrule` (RFC 5545 recurrence expansion — NEW for 003)
**Storage**: PostgreSQL (production), PGlite (test isolation)
**Testing**: Vitest (integration tests with PGlite), Playwright (E2E for P0 flows)
**Target Platform**: Azure (App Service or Container Apps), Node.js 20+
**Project Type**: Web application (Next.js fullstack monorepo — frontend + API routes)
**Performance Goals**: LCP < 2.5s; occurrence expansion < 200ms for 52 weeks horizon; API mutations (booking, RSVP) < 1s at p95; cross-capacity lock hold < 500ms
**Constraints**: Virtual occurrences (not stored); atomic cross-capacity validation; combined pass cancellation is all-or-nothing; single currency per event group; DST-safe local time preservation
**Scale/Scope**: Multi-city platform; hundreds of recurring events (weekly classes); dozens of festivals per year; cross-capacity with up to 10 day-events per festival

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | All recurrence, event group, booking, and concession operations exposed as versioned API routes. TypeScript interfaces in `contracts/` directory. |
| II. Test-First Development | ✅ PASS | Integration tests with PGlite for occurrence expansion, override merging, cross-capacity validation, booking lifecycle. E2E tests for P0 flows (US-1 weekly class, US-2 per-occurrence RSVP). |
| III. Privacy & Data Protection | ✅ PASS | Concession status is PII — only visible to the user and scoped admins. Booking details visible only to booking owner. Concession evidence notes encrypted at rest. |
| IV. Server-Side Authority | ✅ PASS | Occurrence expansion server-side only. Capacity enforcement atomic (SELECT FOR UPDATE). Price calculations server-side. Concession eligibility verified server-side at checkout. RRULE never expanded client-side. |
| V. UX Consistency | ✅ PASS | Recurring event occurrence list, festival group pages, and ticket selection follow shared design system. Mobile-first. Loading/error states on all async operations. |
| VI. Performance Budget | ✅ PASS | Occurrence expansion bounded by configurable horizon. `rrule.js` expansion is O(n) where n = occurrences in window (max ~52). No heavy libraries in initial bundle. API mutations < 1s. |
| VII. Simplicity | ✅ PASS | Virtual occurrences avoid materialisation complexity. Override pattern is a simple `(event_id, date)` patch. One new dependency (`rrule.js`, 15KB, known-hard problem). No premature revenue split logic. |
| VIII. Internationalisation | ✅ PASS | All UI strings via i18n. Currency with `Intl.NumberFormat` + ISO 4217 (inherited from group). Date/time with `Intl.DateTimeFormat` respecting venue timezone. Recurrence descriptions localised ("Every Tuesday", "Tous les mardis"). |
| IX. Scoped Permissions | ✅ PASS | Event group creation requires `withPermission('createEvent', scope)`. Concession approval requires `withPermission('approveConcession', scope)`. Override creation requires event ownership or scoped admin. |
| X. Notification Architecture | ✅ PASS | Occurrence cancellation, booking confirmation, booking cancellation, concession approval/rejection → distinct notification types, async, user-configurable. |
| XI. Resource Ownership | ✅ PASS | Event groups track `createdBy`. All member events must share the same creator. Occurrence overrides share parent event ownership. Group ticket types owned by group creator. |
| XII. Financial Integrity | ✅ PASS | Group ticket checkout via Stripe Connect Standard (direct charges to creator). Cross-capacity validated atomically. Credits applied server-side (FIFO). Combined pass cancellation atomic. Single currency per group (FR-12). Concession pricing server-verified. |
| QG-9: i18n Compliance | ✅ PASS | CI lint ensures no raw string literals in UI components. Recurrence frequency labels extracted for translation. |
| QG-10: Permission Smoke Test | ✅ PASS | Every new mutation endpoint (override create, group create, ticket type create, booking create, concession apply, concession review) includes a 403 integration test for unauthorised caller. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post–Phase 1 re-check: PASS** — data model, contracts, and source structure all align with principles. Cross-capacity atomicity validated against Constitution XII. Virtual occurrences validated against Principle VII (simplicity). Concession privacy validated against Principle III.

## Project Structure

### Documentation (this feature)

```text
specs/003-recurring-multiday/
├── plan.md              # This file
├── spec.md              # Feature specification (local reference)
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — entities, relationships, migrations
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — API contracts
│   ├── recurrence-api.ts     # Occurrence expansion, overrides, series edit/cancel
│   ├── event-groups-api.ts   # Event group CRUD, ticket types
│   ├── bookings-api.ts       # Group ticket booking, cancellation
│   └── concessions-api.ts    # Concession status application, admin review
└── tasks.md             # Phase 2 (created by /speckit.tasks — not this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── events/
│   │   │   └── [id]/
│   │   │       ├── occurrences/
│   │   │       │   ├── route.ts                    # GET — list expanded occurrences
│   │   │       │   └── [date]/
│   │   │       │       ├── route.ts                # GET — single occurrence detail
│   │   │       │       └── override/
│   │   │       │           └── route.ts            # POST/PUT/DELETE — occurrence override
│   │   │       └── series/
│   │   │           └── route.ts                    # PATCH (edit series), DELETE (cancel series)
│   │   ├── event-groups/
│   │   │   ├── route.ts                            # GET (list), POST (create group)
│   │   │   └── [id]/
│   │   │       ├── route.ts                        # GET (detail), PATCH (update), DELETE (delete)
│   │   │       ├── book/
│   │   │       │   └── route.ts                    # POST — book group ticket
│   │   │       └── ticket-types/
│   │   │           ├── route.ts                    # POST — create ticket type
│   │   │           └── [ticketTypeId]/
│   │   │               └── route.ts                # PATCH (update), DELETE (delete)
│   │   ├── bookings/
│   │   │   ├── route.ts                            # GET — list user's bookings
│   │   │   └── [id]/
│   │   │       └── route.ts                        # GET (detail), DELETE (cancel booking)
│   │   ├── concessions/
│   │   │   └── me/
│   │   │       └── route.ts                        # POST (apply), GET (status)
│   │   └── admin/
│   │       └── concessions/
│   │           ├── route.ts                        # GET — list concession applications
│   │           └── [id]/
│   │               └── route.ts                    # PATCH — approve/reject/revoke
│   ├── events/
│   │   └── [id]/
│   │       └── occurrences/
│   │           └── page.tsx                        # Occurrence list page for recurring event
│   ├── event-groups/
│   │   ├── page.tsx                                # Event groups listing (festivals, combos)
│   │   └── [slug]/
│   │       └── page.tsx                            # Event group detail + ticket selection
│   ├── bookings/
│   │   └── page.tsx                                # "My Bookings" page
│   └── settings/
│       └── concession/
│           └── page.tsx                            # Concession status application page
├── lib/
│   ├── recurrence/
│   │   ├── types.ts                                # RecurrenceRule, Occurrence, Override types
│   │   ├── expander.ts                             # RRULE expansion with rrule.js
│   │   ├── overrides.ts                            # Override merge logic
│   │   ├── service.ts                              # Orchestrates expansion + overrides + RSVP counts
│   │   └── series.ts                               # Series edit/cancel logic
│   ├── event-groups/
│   │   ├── types.ts                                # EventGroup, TicketType types
│   │   ├── service.ts                              # Group CRUD, member management
│   │   └── ticket-types.ts                         # Ticket type CRUD, coverage resolution
│   ├── bookings/
│   │   ├── types.ts                                # Booking types
│   │   ├── service.ts                              # Booking create/cancel with cross-capacity
│   │   ├── capacity.ts                             # Cross-capacity validation (extends 001's capacity.ts)
│   │   └── checkout.ts                             # Pricing resolution (standard/concession), credit apply, Stripe charge
│   ├── concessions/
│   │   ├── types.ts                                # ConcessionStatus types
│   │   └── service.ts                              # Apply, check, approve, reject, revoke
│   ├── payments/                                   # Extends 004's stripe-connect.ts (NOT duplicated)
│   └── permissions/                                # Reused from 004 (NOT duplicated)
├── db/
│   └── migrations/
│       └── 003_recurring_multiday.sql              # Schema migration for this feature
└── types/
    └── recurring.ts                                # Shared API contract types

tests/
├── integration/
│   ├── recurrence/
│   │   ├── occurrence-expansion.test.ts            # RRULE expansion, horizon limits
│   │   ├── dst-handling.test.ts                    # DST boundary crossing
│   │   ├── override-cancel.test.ts                 # Single occurrence cancellation
│   │   ├── override-modify.test.ts                 # Single occurrence modification
│   │   ├── series-edit.test.ts                     # Edit all future occurrences
│   │   ├── series-cancel.test.ts                   # Cancel all future occurrences
│   │   └── rsvp-per-occurrence.test.ts             # RSVP with occurrenceDate
│   ├── event-groups/
│   │   ├── group-crud.test.ts                      # Create/update/delete groups
│   │   ├── group-members.test.ts                   # Add/remove member events
│   │   ├── ticket-type-crud.test.ts                # Ticket type management
│   │   └── ownership-validation.test.ts            # All members must share creator
│   ├── bookings/
│   │   ├── book-ticket.test.ts                     # Standard booking flow
│   │   ├── cross-capacity.test.ts                  # Multi-day capacity validation
│   │   ├── concession-pricing.test.ts              # Concession tier at checkout
│   │   ├── credit-application.test.ts              # Credits applied to group bookings
│   │   ├── cancel-booking-credit.test.ts           # Cancel with credit
│   │   ├── cancel-booking-refund.test.ts           # Cancel with Stripe refund
│   │   └── cancel-booking-atomic.test.ts           # Combined pass atomic cancellation
│   └── concessions/
│       ├── apply-concession.test.ts                # User application flow
│       ├── admin-review.test.ts                    # Approve/reject/revoke
│       ├── reapply-after-rejection.test.ts         # Reapplication flow
│       └── checkout-concession.test.ts             # Concession check at checkout
└── e2e/
    ├── recurring-class.spec.ts                     # US-1 E2E: create weekly class, see occurrences
    ├── occurrence-rsvp.spec.ts                     # US-2 E2E: RSVP to specific occurrence
    └── festival-booking.spec.ts                    # US-4 E2E: festival with per-day + combined tickets
```

**Structure Decision**: Next.js App Router monorepo (consistent with Specs 001, 002, 004). Recurrence logic in `src/lib/recurrence/` as a dedicated service layer. Event group and booking logic in `src/lib/event-groups/` and `src/lib/bookings/`. Concession logic in `src/lib/concessions/`. Permission checks reuse `src/lib/permissions/` from Spec 004 — no duplication. Payment integration reuses `src/lib/payments/` from Spec 004. Database migrations in `src/db/migrations/`.

## Cross-Spec Dependencies

| Spec | Dependency Direction | Integration Point |
|------|---------------------|-------------------|
| 001 — Event Discovery & RSVP | 003 extends 001 | 003 populates `events.recurrence_rule`. 001's RSVP/waitlist use `occurrence_date` for per-occurrence keying. 001's capacity check must now include group bookings in effective attendee count. 001's refund policy reused for booking cancellations. 001's credit system reused for group booking credits. |
| 004 — Permissions & Creator Accounts | 003 depends on 004 | `withPermission('createEvent', scope)` on event group creation. `withPermission('approveConcession', scope)` for concession admin review. Stripe Connect from 004 used for group ticket payments. Auth session from 004. |
| 002 — Community Social | Loose coupling | Discussion threads (from 002) may attach to event groups. ConcessionStatus references user profile (from 002). No hard dependency — 003 functions without 002. |
| 005 — Teacher Profiles | 005 extends 003 | Teacher assignment to event groups (festival teaching slots). No direct 003 dependency on 005 — 005 adds a junction table. |

## Spec 001 Modifications Required

Spec 003 requires the following changes to Spec 001's existing implementation:

1. **Capacity service** (`src/lib/events/capacity.ts`): The `getEffectiveAttendeeCount()` function must be extended to include group bookings in the count. Currently it only counts `rsvps` — it must also join `bookings` through `ticket_types → ticket_type_events` for events that are group members.

2. **Event listing** (`src/lib/events/service.ts`): The event listing query must expand recurring events into virtual occurrences when `recurrence_rule IS NOT NULL`. Each expanded occurrence appears as a separate `EventSummary` entry with `nextOccurrence` field for sorting.

3. **RSVP creation** (`src/lib/rsvp/service.ts`): The RSVP creation flow must validate `occurrenceDate` against the event's RRULE schedule (confirm the date is a valid occurrence) and check for cancelled overrides before allowing RSVP.

## Complexity Tracking

No constitution violations detected. No complexity justifications needed.

| Decision | Rationale (Principle VII check) |
|----------|-------------------------------|
| New dependency: `rrule.js` | Known-hard problem: RFC 5545 recurrence with DST, BYSETPOS, EXDATE. ~15KB gzipped. Eliminates > 500 lines of custom recurrence logic. Principle VII exception granted. |
| 7 new database tables | Each table maps to a distinct entity in the spec. No unnecessary tables. `ticket_type_events` is a junction table required for per-day ticket coverage — cannot be denormalised. |
| Cross-capacity join query | Required by FR-08 and Constitution XII. The effective attendee count query joins `rsvps` + `bookings` — this is the simplest correct approach. No materialised view or counter cache needed at this scale. |

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — technology decisions, alternatives | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
