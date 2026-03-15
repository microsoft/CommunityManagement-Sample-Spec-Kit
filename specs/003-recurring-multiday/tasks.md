# Tasks: Recurring & Multi-Day Events

**Input**: Design documents from `/specs/003-recurring-multiday/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not included — add test phases if TDD is requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Next.js fullstack monorepo (App Router)
- Source: `src/` at repository root
- API routes: `src/app/api/`
- Pages: `src/app/`
- Service layer: `src/lib/`
- Migrations: `src/db/migrations/`
- Shared types: `src/types/`

## Cross-Spec Dependencies

| Spec | Relationship | Integration Points |
|------|-------------|-------------------|
| 001 — Event Discovery & RSVP | 003 extends 001 | `events.recurrence_rule` column, `rsvps.occurrence_date` composite key, capacity service extended for group bookings, credit system reused for booking refunds |
| 004 — Permissions & Creators | 003 depends on 004 | `withPermission('createEvent', scope)` for group creation, `withPermission('approveConcession', scope)` for concession admin, Stripe Connect for group ticket payments, auth session |
| 005 — Teacher Profiles | 005 extends 003 (downstream) | Teacher assignment to event groups; no 003 dependency on 005 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependency, configure environment, scaffold shared types

- [ ] T001 Install `rrule` npm package and add `RECURRENCE_HORIZON_WEEKS=12` to environment configuration in `.env.local` / `.env.example`
- [ ] T002 [P] Create shared API contract types (re-export recurrence, event group, booking, concession interfaces from spec contracts) in src/types/recurring.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and domain type definitions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create database migration with all 7 tables (occurrence_overrides, event_groups, event_group_members, ticket_types, ticket_type_events, bookings, concession_statuses) including indexes and check constraints per data-model.md in src/db/migrations/003_recurring_multiday.sql
- [ ] T004 [P] Create recurrence domain types (RecurrenceRule, RecurrenceFrequency, DayOfWeek, Occurrence, OccurrenceOverride, OccurrenceModifiableFields, SeriesEditScope) in src/lib/recurrence/types.ts
- [ ] T005 [P] Create event group domain types (EventGroup, EventGroupType, EventGroupMember, TicketType, TicketTypeCoverage) in src/lib/event-groups/types.ts
- [ ] T006 [P] Create booking domain types (Booking, BookingStatus, PricingTier, BookingCancellationType, BookingCoveredEvent) in src/lib/bookings/types.ts
- [ ] T007 [P] Create concession domain types (ConcessionStatus, ConcessionStatusValue, ConcessionAction, ConcessionCheckResult) in src/lib/concessions/types.ts

**Checkpoint**: Schema migrated, all domain types defined — user story implementation can begin

---

## Phase 3: User Story 1 — Create a Weekly Recurring Class (Priority: P0) 🎯 MVP

**Goal**: An event creator sets a weekly recurrence rule on an event and all future occurrences appear automatically via virtual expansion, each with independent RSVP counts.

**Independent Test**: Create event with `recurrence_rule = "FREQ=WEEKLY;BYDAY=TU"`, call `GET /api/events/:id/occurrences` and verify it returns 12 weeks of Tuesday dates with correct local times across DST boundaries, cancelled overrides filtered out, modified overrides merged.

### Implementation for User Story 1

- [ ] T008 [US1] Implement RRULE occurrence expander with DST-safe timezone handling (rrule.js `between()` with venue IANA timezone from `cities.timezone`, configurable horizon via `RECURRENCE_HORIZON_WEEKS`) in src/lib/recurrence/expander.ts
- [ ] T009 [P] [US1] Implement occurrence override read-side (load all overrides for event, filter cancelled dates from expansion, merge modified fields onto base event) in src/lib/recurrence/overrides.ts
- [ ] T010 [US1] Implement recurrence service orchestrating expansion + override merge + per-occurrence RSVP/waitlist count aggregation in src/lib/recurrence/service.ts
- [ ] T011 [US1] Extend Spec 001 event listing to expand recurring events (`recurrence_rule IS NOT NULL`) as virtual occurrence entries with `nextOccurrence` field for sorting in src/lib/events/service.ts
- [ ] T012 [US1] Implement GET /api/events/[id]/occurrences (paginated occurrence list within date window, horizon-bounded, cancelled filtered unless `includeCancelled`) in src/app/api/events/[id]/occurrences/route.ts
- [ ] T013 [P] [US1] Implement GET /api/events/[id]/occurrences/[date] (single occurrence detail with full event fields, override record, user RSVP status) in src/app/api/events/[id]/occurrences/[date]/route.ts
- [ ] T014 [US1] Create occurrence list page for recurring events (upcoming occurrences, per-occurrence RSVP counts, cancelled/modified indicators) in src/app/events/[id]/occurrences/page.tsx

**Checkpoint**: Recurring events expand into virtual occurrences with correct DST handling, override-aware filtering, and per-occurrence RSVP counts. MVP functional.

---

## Phase 4: User Story 2 — RSVP to a Specific Occurrence (Priority: P0)

**Goal**: A community member RSVPs to a specific occurrence of a recurring event by date, with the system validating the occurrence date is a valid RRULE date and not cancelled.

**Independent Test**: Given a weekly recurring event, RSVP to a valid future Tuesday (success), attempt RSVP to a Wednesday (400 — not in schedule), attempt RSVP to a cancelled override date (409 — occurrence cancelled). Verify occurrence listing shows updated RSVP count.

### Implementation for User Story 2

- [ ] T015 [US2] Extend Spec 001 RSVP creation to validate `occurrenceDate` against event RRULE schedule (confirm date is a valid expanded occurrence) and reject RSVPs to cancelled overrides in src/lib/rsvp/service.ts

**Checkpoint**: Per-occurrence RSVP flow validated end-to-end — attendees can RSVP to individual occurrences of a recurring event.

---

## Phase 5: User Story 3 — Cancel or Edit a Single Occurrence (Priority: P1)

**Goal**: An event creator cancels or modifies a single occurrence without affecting the rest of the series, or edits/cancels all future occurrences at once. Affected attendees receive notifications.

**Independent Test**: (a) Create override on March 15 to change venue — only March 15 shows new venue, other dates unaffected. (b) Cancel March 22 — it disappears from occurrence list, RSVP'd attendees get notification. (c) Edit series to change time — all future occurrences reflect new time, past overrides preserved. (d) Cancel series — event set to cancelled, all future RSVP'd attendees notified and paid RSVPs refunded.

### Implementation for User Story 3

- [ ] T016 [US3] Implement occurrence override write operations (create with RRULE date validation, update modified fields, delete to restore defaults) extending the read-side from T009 in src/lib/recurrence/overrides.ts
- [ ] T017 [US3] Implement POST (create override), PUT (update), DELETE (remove) /api/events/[id]/occurrences/[date]/override with permission checks (`withPermission('editEvent', eventCity)`) in src/app/api/events/[id]/occurrences/[date]/override/route.ts
- [ ] T018 [US3] Implement series edit logic (update base event fields for all-future, RRULE change with stale override cleanup) and series cancel logic (set event status cancelled, refund paid RSVPs per Spec 001 creator-cancellation policy) in src/lib/recurrence/series.ts
- [ ] T019 [US3] Implement PATCH /api/events/[id]/series (edit all future) and DELETE /api/events/[id]/series (cancel series) endpoints with permission checks in src/app/api/events/[id]/series/route.ts
- [ ] T020 [US3] Integrate notification dispatch for single-occurrence cancellation (notify RSVP'd attendees for `(eventId, occurrenceDate)`) and series-wide cancellation (notify all future RSVP'd attendees) — async, outside transaction

**Checkpoint**: Single occurrence overrides (cancel/modify) and series-wide edit/cancel fully functional with attendee notifications.

---

## Phase 6: User Story 4 — Multi-Day Festival with Per-Day and Combined Tickets (Priority: P1)

**Goal**: A festival organiser creates an event group spanning multiple days, defines per-day and combined-pass ticket types, and attendees book tickets with atomic cross-capacity validation. Combined passes are cancelled atomically with refund per Spec 001 policy.

**Independent Test**: (a) Create festival with Fri/Sat/Sun events and "Friday Only" / "Full Weekend" ticket types. (b) Book Full Weekend — verify Fri, Sat, Sun each decrement capacity. (c) Fill Saturday to capacity with mixed individual + weekend tickets — verify Saturday-only and Full Weekend both show unavailable. (d) Cancel Full Weekend booking — verify all 3 days release capacity atomically and refund/credit issued.

### Implementation for User Story 4

#### Service Layer

- [ ] T021 [P] [US4] Implement event group CRUD service (create with ownership validation — all members must share same creator, update with add/remove members, delete with cascade booking cancellation + auto-refund) in src/lib/event-groups/service.ts
- [ ] T022 [P] [US4] Implement ticket type CRUD and coverage resolution (`covers_all_events` → all group members; otherwise resolve from `ticket_type_events` junction; validate covered events are group members) in src/lib/event-groups/ticket-types.ts
- [ ] T023 [US4] Implement cross-capacity validation with deterministic `SELECT FOR UPDATE` lock ordering (sorted by event UUID) and effective attendee count (individual RSVPs + group bookings) per data-model.md capacity query in src/lib/bookings/capacity.ts
- [ ] T024 [US4] Extend Spec 001 capacity service `getEffectiveAttendeeCount()` to join `bookings` through `ticket_types → ticket_type_events` for events that are group members in src/lib/events/capacity.ts
- [ ] T025 [US4] Implement checkout flow: resolve pricing tier (standard vs concession — query `concession_statuses` for approved status), apply FIFO credits scoped to group creator (reuse Spec 001 credit system), charge remainder via Stripe Connect Standard direct charge in src/lib/bookings/checkout.ts
- [ ] T026 [US4] Implement booking service: atomic create (lock covered events → validate cross-capacity → checkout → insert booking) and atomic cancel (mark cancelled → release capacity on all covered events → refund per Spec 001 policy using earliest event start for refund window) in src/lib/bookings/service.ts

#### API Routes — Event Groups

- [ ] T027 [US4] Implement GET (list with type/city/date filters, paginated) and POST (create group with `withPermission('createEvent', scope)`) /api/event-groups in src/app/api/event-groups/route.ts
- [ ] T028 [US4] Implement GET (detail with member events + ticket types + availability), PATCH (update metadata + members), DELETE (cascade cancel bookings + auto-refund) /api/event-groups/[id] in src/app/api/event-groups/[id]/route.ts
- [ ] T029 [P] [US4] Implement POST /api/event-groups/[id]/ticket-types (create ticket type — validate group is festival/combo, coveredEventIds are group members, concessionCost ≤ cost) in src/app/api/event-groups/[id]/ticket-types/route.ts
- [ ] T030 [P] [US4] Implement PATCH (update) and DELETE (cancel active bookings + auto-refund) /api/event-groups/[id]/ticket-types/[ticketTypeId] in src/app/api/event-groups/[id]/ticket-types/[ticketTypeId]/route.ts

#### API Routes — Bookings

- [ ] T031 [US4] Implement POST /api/event-groups/[id]/book (book ticket — validate ticket type, check duplicate booking, run atomic cross-capacity checkout flow) in src/app/api/event-groups/[id]/book/route.ts
- [ ] T032 [P] [US4] Implement GET /api/bookings (list user's bookings, paginated, filterable by status) in src/app/api/bookings/route.ts
- [ ] T033 [P] [US4] Implement GET /api/bookings/[id] (booking detail with cancellation eligibility based on earliest covered event + refund window) in src/app/api/bookings/[id]/route.ts
- [ ] T034 [US4] Implement DELETE /api/bookings/[id] (cancel booking — atomic combined-pass cancellation, release all covered event capacities, process refund/credit choice per Spec 001 policy) in src/app/api/bookings/[id]/route.ts

#### Frontend Pages

- [ ] T035 [US4] Create event groups listing page (filter by type/city, display poster, priceFrom, date range) in src/app/event-groups/page.tsx
- [ ] T036 [P] [US4] Create event group detail page with member event schedule, ticket type selection, availability display, and book button (concession price shown only if user has approved status) in src/app/event-groups/[slug]/page.tsx
- [ ] T037 [US4] Create "My Bookings" page with booking list, covered events, cancellation eligibility, and cancel button in src/app/bookings/page.tsx

**Checkpoint**: Full festival booking lifecycle — create group, define ticket types, book with cross-capacity, cancel atomically with refund. Combined passes validated against all constituent day capacities.

---

## Phase 7: Concession Status — FR-11 (Priority: P1)

**Goal**: Users self-apply for concession status; scoped admins approve/reject/revoke. Approved users see reduced concession pricing at checkout for any ticket type that defines a concession cost.

**Independent Test**: (a) User applies for concession — status is `pending`. (b) Admin approves — status is `approved`. (c) User books ticket with concession price — server verifies concession status and applies `concessionCost`. (d) Admin revokes — user loses concession pricing on future purchases.

### Implementation for Concession Status

- [ ] T038 [US5] Implement concession service: apply (enforce one active/pending per user via partial unique index), get own status + history, admin list (scoped by `withPermission('approveConcession', scope)`), admin review (approve/reject/revoke state machine transitions per data-model.md) in src/lib/concessions/service.ts
- [ ] T039 [US5] Implement POST (apply — validate no existing pending/approved) and GET (own status + history) /api/concessions/me in src/app/api/concessions/me/route.ts
- [ ] T040 [P] [US5] Implement GET /api/admin/concessions (list applications filtered by status, paginated, scoped to admin's permission scope) in src/app/api/admin/concessions/route.ts
- [ ] T041 [P] [US5] Implement PATCH /api/admin/concessions/[id] (approve/reject/revoke with state transition validation — 422 on invalid transitions) in src/app/api/admin/concessions/[id]/route.ts
- [ ] T042 [US5] Create concession application page (apply form with evidence notes, current status display, history of past applications) in src/app/settings/concession/page.tsx

**Checkpoint**: Concession lifecycle complete — apply, review, approve/reject/revoke. Concession pricing integrated into booking checkout (T025).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: i18n, permission coverage verification, quickstart validation

- [ ] T043 [P] Add i18n translation keys for recurrence frequency labels ("Every Tuesday", "Tous les mardis"), occurrence status strings, ticket type names, booking status labels, and concession status strings
- [ ] T044 [P] Verify all new mutation endpoints enforce `withPermission()` from Spec 004: `createEvent` scope on group/override/series creation, `editEvent` scope on updates, `approveConcession` scope on concession review
- [ ] T045 Run quickstart.md validation — verify npm install, rrule dependency, migration execution, dev server start, and all lifecycle flows (recurring class → RSVP → override → festival booking → concession) work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────────────────────────────────────────────┐
                                                                        │
Phase 2: Foundational (BLOCKS all user stories) ───────────────────────┤
                                                                        │
   ┌────────────────────────────────────────────────────────────────────┘
   │
   ├── Phase 3: US-1 — Recurring Events (P0) 🎯 MVP
   │      │
   │      ├── Phase 4: US-2 — Per-Occurrence RSVP (P0)
   │      │     (extends US-1's occurrence expansion)
   │      │
   │      └── Phase 5: US-3 — Override & Series Edit (P1)
   │            (extends US-1's override read-side)
   │
   ├── Phase 6: US-4 — Festival Ticketing (P1)
   │      (independent of US-1/2/3; own entity set)
   │      │
   │      └── Phase 7: US-5 — Concession Status (P1)
   │            (concession check used by US-4's checkout)
   │
   └── Phase 8: Polish (after all desired stories complete)
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| US-1 (P0) — Recurring Events | Foundational (Phase 2) | — |
| US-2 (P0) — Per-Occurrence RSVP | US-1 (needs occurrence expansion) | US-3, US-4 |
| US-3 (P1) — Override & Series Edit | US-1 (extends overrides.ts) | US-4, US-5 |
| US-4 (P1) — Festival Ticketing | Foundational only (Phase 2) | US-1, US-2, US-3 |
| US-5 (P1) — Concession Status | Foundational only (Phase 2) | US-1, US-2, US-3; integrates with US-4 checkout |

### Within Each User Story

1. Types/domain models before services
2. Services before API routes
3. API routes before frontend pages
4. Core logic before integration with other specs
5. Tasks marked [P] can run in parallel within their phase

### Cross-Spec Integration Points

| Task | Spec | Integration |
|------|------|-------------|
| T011 | 001 | Extend event listing with virtual occurrence expansion |
| T015 | 001 | Extend RSVP creation with RRULE date validation |
| T024 | 001 | Extend capacity service with group booking counts |
| T025 | 001+004 | Reuse credit system (001) and Stripe Connect (004) for checkout |
| T017, T019 | 004 | `withPermission()` checks on override and series mutations |
| T027 | 004 | `withPermission('createEvent', scope)` on group creation |
| T040-T041 | 004 | `withPermission('approveConcession', scope)` on concession admin |

### Parallel Opportunities

**Within Phase 2** (Foundational):
```
T003 (migration) → sequential (must complete first)
T004, T005, T006, T007 → all parallel (independent type files)
```

**Within Phase 3** (US-1):
```
T008 (expander) ─┬─ parallel ─── T009 (overrides read-side)
                  │
T010 (service) ←──┘ depends on T008 + T009
T011 (extend 001 listing) ← depends on T010
T012, T013 → parallel (independent route files, both depend on T010)
T014 (page) ← depends on T012 + T013
```

**Within Phase 6** (US-4):
```
T021 (group service) ─┬─ parallel ─── T022 (ticket type service)
                       │
T023 (capacity) ← depends on T022
T024 (extend 001 capacity) ← can parallel with T023
T025 (checkout) ← depends on T023
T026 (booking service) ← depends on T023 + T025
T027, T028 ← depend on T021
T029, T030 → parallel (depend on T022)
T031 ← depends on T026
T032, T033 → parallel (depend on T026)
T034 ← depends on T026
T035, T036, T037 → parallel after API routes complete
```

**Cross-story parallelism**: US-4 (festival ticketing) can start immediately after Phase 2, in parallel with US-1/US-2/US-3, since it uses a completely separate entity set (event_groups, ticket_types, bookings).

---

## Implementation Strategy

### MVP Scope (Recommended)

**Phase 1 + Phase 2 + Phase 3 (US-1)** = Recurring events with virtual occurrence expansion. This alone delivers the weekly class use case — the single highest-value feature for community platforms.

### Incremental Delivery

| Increment | Phases | Delivers |
|-----------|--------|----------|
| MVP | 1 + 2 + 3 | Recurring event creation, occurrence listing, DST handling |
| +RSVP | + Phase 4 | Per-occurrence RSVP with schedule validation |
| +Overrides | + Phase 5 | Single occurrence cancel/modify, series edit/cancel |
| +Festivals | + Phase 6 | Event groups, ticket types, cross-capacity booking |
| +Concessions | + Phase 7 | Concession pricing, admin workflow |
| Complete | + Phase 8 | i18n, permission audit, quickstart validation |

### Key Technical Decisions

| Decision | Reference | Rationale |
|----------|-----------|-----------|
| Virtual occurrences (not stored) | R-1 | FR-02 mandate; RRULE is source of truth |
| `rrule.js` for expansion | R-1 | Known-hard problem; ~15KB; Principle VII exception |
| DST via venue IANA timezone | R-2 | Same local time across DST; rrule.js `tzid` option |
| Override as `(event_id, date)` patch | R-3 | Google Calendar pattern; simple, queryable |
| Cross-capacity via `SELECT FOR UPDATE` | R-5 | Same pattern as Spec 001; deterministic lock ordering |
| Atomic combined-pass cancellation | R-8 | FR-10 mandate; no partial day drop |
| Configurable 12-week horizon | R-9 | Performance bound; platform-wide setting |

---

## Summary

| Metric | Value |
|--------|-------|
| **Total tasks** | 45 |
| **US-1 tasks** (P0 — Recurring Events) | 7 |
| **US-2 tasks** (P0 — Per-Occurrence RSVP) | 1 |
| **US-3 tasks** (P1 — Override & Series Edit) | 5 |
| **US-4 tasks** (P1 — Festival Ticketing) | 17 |
| **US-5 tasks** (P1 — Concession Status) | 5 |
| **Setup + Foundational** | 7 |
| **Polish** | 3 |
| **Parallel opportunities** | 22 tasks marked [P] or parallel-eligible |
| **Spec 001 integration points** | 3 (event listing, RSVP validation, capacity service) |
| **Spec 004 integration points** | 4 (permissions, Stripe Connect, auth, concession scope) |
| **New dependency** | `rrule` (RFC 5545, ~15KB) |
| **New database tables** | 7 |
| **Suggested MVP** | Phases 1–3 (US-1: recurring event expansion) |
