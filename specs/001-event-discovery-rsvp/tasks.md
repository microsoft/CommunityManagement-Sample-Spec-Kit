# Tasks: Event Discovery & RSVP

**Input**: Design documents from `/specs/001-event-discovery-rsvp/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested — test tasks are omitted. Tests should be added per Constitution Principle II when a TDD pass is planned.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Cross-Spec Dependency**: Spec 004 (Permissions & Creator Accounts) MUST be implemented first. This spec depends on `withPermission()` middleware, auth session (next-auth + Entra External ID), Member role checks, and Visitor access patterns.

**Downstream Consumers**: Spec 003 (Recurring/Multi-Day) extends Event entity; Spec 005 (Teacher Profiles) adds teacher assignment; Spec 002 (Community Social) shares City entity and event threads.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, seed data, shared types, and project scaffolding for the event feature. Assumes Spec 004's auth, permissions, and Stripe Connect are already in place.

- [ ] T001 Create database migration file with all 8 entity tables (countries, cities, venues, events, rsvps, waitlist, event_interests, credits) in `src/db/migrations/001_events.sql` — copy SQL from data-model.md
- [ ] T002 Create city/country seed script that populates countries and cities tables with initial platform cities (Bristol, London, Berlin, Lisbon, etc.) and syncs `cities.slug` with `geography.city` from Spec 004 — `src/db/seeds/001_cities.ts`
- [ ] T003 [P] Add `ical-generator` and `leaflet` + `@types/leaflet` + `react-leaflet` to project dependencies in `package.json`
- [ ] T004 [P] Add `NEXT_PUBLIC_BASE_URL` environment variable to `.env.local` and `.env.example` per quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, Zod schemas, and service scaffolding that ALL user stories depend on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Define shared TypeScript enums and types (EventCategory, SkillLevel, EventStatus, AcroRole, RsvpStatus, CancellationType) in `src/lib/events/types.ts` — match contract interfaces from `contracts/events-api.ts`
- [ ] T006 [P] Define RSVP, Waitlist, and Interest TypeScript types in `src/lib/rsvp/types.ts` — match `contracts/rsvp-api.ts`
- [ ] T007 [P] Define Venue types in `src/lib/venues/types.ts` — match `contracts/venues-api.ts`
- [ ] T008 [P] Define City types in `src/lib/cities/types.ts` — match `contracts/cities-api.ts`
- [ ] T009 [P] Define Credit types in `src/lib/credits/types.ts` — match `contracts/credits-api.ts`
- [ ] T010 [P] Create Zod validation schemas for all API request bodies (CreateEventRequest, UpdateEventRequest, CreateRsvpRequest, CancelRsvpRequest, CreateVenueRequest, UpdateVenueRequest, JoinWaitlistRequest, ListEventsQuery, ListCitiesQuery, NearestCityQuery) in `src/lib/events/validation.ts` and `src/lib/rsvp/validation.ts`
- [ ] T011 Implement City service — `listCities()` (with activeOnly, countryCode, q filters) and `getCityById()` in `src/lib/cities/service.ts`
- [ ] T012 Implement geolocation snap — `findNearestCity(lat, lon)` using Haversine distance query against cities with active events, 100km threshold per R-1 in `src/lib/cities/service.ts`
- [ ] T013 [P] Implement Venue service — `createVenue()`, `getVenue()`, `listVenues()`, `updateVenue()` in `src/lib/venues/service.ts` — enforce `withPermission('createVenue', ...)` on create
- [ ] T014 Create Cities API routes — `GET /api/cities` (list) in `src/app/api/cities/route.ts` and `GET /api/cities/nearest` (geolocation snap) in `src/app/api/cities/nearest/route.ts`
- [ ] T015 [P] Create Venues API routes — `GET /api/venues` (list), `POST /api/venues` (create, Creator auth) in `src/app/api/venues/route.ts`; `GET /api/venues/:id` (detail), `PATCH /api/venues/:id` (edit, Owner auth) in `src/app/api/venues/[id]/route.ts`

**Checkpoint**: City registry, geolocation snap, and venue CRUD are operational. All shared types and validation schemas are available.

---

## Phase 3: User Story 1 — Browse Events Without Account (Priority: P0) 🎯 MVP

**Goal**: A visitor (no login) can open the events page and see upcoming events sorted by date, each showing title, date/time, location, category badge, skill level badge, cost, and attendee count. Geolocation auto-filters to nearest city.

**Independent Test**: Open `/events` in an incognito browser — event cards render with all metadata. Grant geolocation — events filter to nearest city. Deny geolocation — all events shown with city picker.

### Implementation

- [ ] T016 Implement Event service — `listEvents(filters)` with pagination in `src/lib/events/service.ts` — query builder joins events→venues→cities, returns `EventSummary[]` with `confirmedCount` (from active RSVPs count) and `interestedCount`
- [ ] T017 Implement Event service — `createEvent(data, userId)` with Zod validation and `withPermission('createEvent', venueCity)` check in `src/lib/events/service.ts`
- [ ] T018 Implement Event service — `getEventById(id, userId?)` returning `EventDetail` with venue, role breakdown, and visible attendees in `src/lib/events/service.ts`
- [ ] T019 Create Events list API route — `GET /api/events` in `src/app/api/events/route.ts` — public access, delegates to `listEvents()`, returns `ListEventsResponse` with `detectedCity` from query params
- [ ] T020 Create Event create API route — `POST /api/events` in `src/app/api/events/route.ts` — Creator auth via `withPermission('createEvent', ...)`, Zod-validates `CreateEventRequest`
- [ ] T021 Build EventCard component displaying title, date/time, venue name, city, category badge, skill level badge, cost (or "Free"), attendee count, and poster image in `src/components/events/EventCard.tsx`
- [ ] T022 Build EventsListPage server component at `src/app/events/page.tsx` — reads filters from `searchParams`, calls `GET /api/events`, renders EventCard grid, shows city picker when no geolocation match
- [ ] T023 Implement client-side geolocation hook that calls `GET /api/cities/nearest` and redirects to `/events?city={slug}` on match, or shows city picker prompt on no-match/denial in `src/hooks/useGeolocation.ts`

**Checkpoint**: Visitors can browse events at `/events`. Geolocation auto-filters work. Event cards display all required metadata.

---

## Phase 4: User Story 2 — Filter and Search Events (Priority: P0)

**Goal**: Users can filter events by category, skill level, date range, status, and city. All filters reflected in URL query params (bookmarkable per SC-06).

**Independent Test**: Navigate to `/events?category=workshop&skillLevel=intermediate` — only matching events appear. Change filters — URL updates. Copy URL into new tab — same results.

### Implementation

- [ ] T024 [US2] Extend `listEvents()` query builder in `src/lib/events/service.ts` with category (multi-select), skillLevel (multi-select), dateFrom/dateTo range, and status (new/full/past/booked/interested with OR logic per FR-12) filters
- [ ] T025 [US2] Build EventFilters component with category pills, skill level pills, date range calendar picker, status pills (New/Full/Past/Booked/Interested), and city selector in `src/components/events/EventFilters.tsx` — all filters sync to URL query params via `useSearchParams()`
- [ ] T026 [US2] Wire EventFilters into EventsListPage at `src/app/events/page.tsx` — filters read from and write to URL, triggering server component re-fetch

**Checkpoint**: All filter combinations work. Filters are bookmarkable via URL. Status pills use OR logic.

---

## Phase 5: User Story 3 — View Event Details (Priority: P0)

**Goal**: Clicking an event card opens a detail page with full description, interactive map, external map links, attendee list with role breakdown, cost, prerequisites, and "Add to calendar" button.

**Independent Test**: Click any event card — detail page renders with all fields. Map shows correct pin. External map links open in new tabs. Role breakdown (Base/Flyer/Hybrid counts) is accurate.

### Implementation

- [ ] T027 [US3] Create Event detail API route — `GET /api/events/:id` in `src/app/api/events/[id]/route.ts` — public access, returns `GetEventResponse` with venue detail, role breakdown, and opted-in attendees
- [ ] T028 [P] [US3] Build EventMap component using Leaflet + OSM tiles, lazy-loaded via `next/dynamic` with `ssr: false`, showing venue pin in `src/components/events/EventMap.tsx`
- [ ] T029 [P] [US3] Build MapLinks component generating external links (Google Maps, Apple Maps, OSM, What3Words) from venue lat/lon per R-9 in `src/components/events/MapLinks.tsx`
- [ ] T030 [P] [US3] Build RoleBreakdown component displaying Base/Flyer/Hybrid counts with role balance hint ("Flyers needed!" when imbalanced per FR-14) in `src/components/events/RoleBreakdown.tsx`
- [ ] T031 [P] [US3] Build AttendeeList component showing names of attendees who opted in (`nameVisible: true`) grouped by role in `src/components/events/AttendeeList.tsx`
- [ ] T032 [US3] Build EventDetailPage server component at `src/app/events/[id]/page.tsx` — renders title, description, date/time with timezone, venue with EventMap and MapLinks, category/skill badges, prerequisites, cost with currency (`Intl.NumberFormat`), RoleBreakdown, AttendeeList, and "Add to calendar" button
- [ ] T033 [US3] Implement `generateMetadata()` in `src/app/events/[id]/page.tsx` for Open Graph meta tags (og:title, og:description, og:image, og:url) per R-7 — enables rich social previews (FR-11)

**Checkpoint**: Event detail page fully renders. Map is interactive and lazy-loaded. External map links work. OG meta tags present in page source.

---

## Phase 6: User Story 4 — RSVP to an Event (Priority: P0)

**Goal**: Logged-in members can RSVP with role selection (Base/Flyer/Hybrid), with atomic capacity enforcement. Paid events use Stripe Connect with credit auto-apply. Cancellation respects refund window with credit-preferred flow.

**Independent Test**: RSVP to a free event — confirmation shown with Add to Calendar and Cancel options. RSVP to a paid event — Stripe charge processed, credits auto-applied. Cancel within refund window — credit/refund choice offered. Cancel after window — no refund.

### Implementation

- [ ] T034 [US4] Implement atomic capacity check — `checkAndReserveCapacity(eventId, occurrenceDate)` using `SELECT ... FOR UPDATE` per R-2 in `src/lib/events/capacity.ts`
- [ ] T035 [US4] Implement Credit service — `getAvailableCredits(userId, creatorId, currency)`, `consumeCredits(credits, amount)` with FIFO ordering, `issueCredit(userId, creatorId, amount, currency, eventId, rsvpId)` in `src/lib/credits/service.ts`
- [ ] T036 [US4] Implement paid event checkout — `processEventCheckout(userId, eventId, creatorId, amount, currency)` that auto-applies credits then charges remainder via Stripe Connect (reusing 004's stripe-connect.ts) in `src/lib/payments/checkout.ts`
- [ ] T037 [US4] Implement RSVP service — `createRsvp(eventId, userId, role, nameVisible, occurrenceDate, prerequisiteConfirmed)` orchestrating: Zod validation → capacity check → payment (if paid) → INSERT rsvp → queue notification in `src/lib/rsvp/service.ts`
- [ ] T038 [US4] Implement RSVP cancellation — `cancelRsvp(rsvpId, userId, refundChoice)` with refund window check, credit issuance or Stripe refund per R-5, and waitlist auto-promotion trigger in `src/lib/rsvp/service.ts`
- [ ] T039 [US4] Create RSVP API routes — `POST /api/events/:id/rsvp` (create, Member auth) and `DELETE /api/events/:id/rsvp` (cancel, Owner auth) in `src/app/api/events/[id]/rsvp/route.ts` — Zod validation at boundary, delegates to RSVP service
- [ ] T040 [US4] Build RsvpForm component with role selector (Base/Flyer/Hybrid radio buttons), prerequisite confirmation checkbox (when event has prerequisites), and submit button in `src/components/events/RsvpForm.tsx`
- [ ] T041 [US4] Build RsvpConfirmation component showing confirmed role, "Add to calendar" button, and "Cancel RSVP" option in `src/components/events/RsvpConfirmation.tsx`
- [ ] T042 [US4] Build CancelRsvpDialog component with refund window awareness — shows credit (default) vs refund choice within window, or no-refund policy warning after window in `src/components/events/CancelRsvpDialog.tsx`
- [ ] T043 [US4] Integrate RSVP flow into EventDetailPage at `src/app/events/[id]/page.tsx` — show RsvpForm for authenticated users with capacity, RsvpConfirmation for already-RSVP'd users, or "Event Full" with waitlist CTA when at capacity
- [ ] T044 [US4] Create Credits API route — `GET /api/credits` (list caller's credit balances, Member auth) in `src/app/api/credits/route.ts`

**Checkpoint**: Full RSVP lifecycle works — create (free + paid), cancel with credit/refund, capacity enforcement is atomic. Credits auto-apply at checkout.

---

## Phase 7: User Story 5 — Waitlist When Event is Full (Priority: P1)

**Goal**: Members can join a waitlist for full events. First-in-line is auto-promoted when a spot opens (before the cutoff time). Paid event promotions create a pending_payment RSVP with a payment timeout.

**Independent Test**: Fill an event to capacity. Next user joins waitlist with position shown. Cancel one RSVP before cutoff — waitlisted user auto-promoted. Cancel after cutoff — no promotion.

### Implementation

- [ ] T045 [US5] Implement Waitlist service — `joinWaitlist(eventId, userId, role, occurrenceDate)` auto-assigning position, `leaveWaitlist(eventId, userId, occurrenceDate)` in `src/lib/rsvp/waitlist.ts`
- [ ] T046 [US5] Implement waitlist auto-promotion — `promoteNextWaitlisted(eventId, occurrenceDate)` checking cutoff time, creating RSVP (or pending_payment for paid events), queuing notification per R-3 in `src/lib/rsvp/waitlist.ts`
- [ ] T047 [US5] Wire auto-promotion into `cancelRsvp()` in `src/lib/rsvp/service.ts` — after successfully cancelling, call `promoteNextWaitlisted()` within the same transaction
- [ ] T048 [US5] Create Waitlist API routes — `POST /api/events/:id/waitlist` (join, Member auth) and `DELETE /api/events/:id/waitlist` (leave, Owner auth) in `src/app/api/events/[id]/waitlist/route.ts`
- [ ] T049 [US5] Build WaitlistButton component showing "Join Waitlist" for full events, displaying position after joining, and "Leave Waitlist" option in `src/components/events/WaitlistButton.tsx`
- [ ] T050 [US5] Integrate WaitlistButton into EventDetailPage at `src/app/events/[id]/page.tsx` — show when event is at capacity and user has no active RSVP

**Checkpoint**: Waitlist join/leave works. Auto-promotion fires on RSVP cancellation before cutoff. No promotion after cutoff.

---

## Phase 8: User Story 6 — Mark Interest Without Committing (Priority: P1)

**Goal**: Members can toggle "Interested" on events to track them. Interest count shows on event cards. Users can filter by "Interested" status.

**Independent Test**: Toggle interest on an event — count increments. Toggle again — count decrements. Filter events by "Interested" — only marked events shown.

### Implementation

- [ ] T051 [P] [US6] Implement Interest service — `toggleInterest(eventId, userId)` returning `{ interested, interestedCount }` in `src/lib/rsvp/service.ts`
- [ ] T052 [P] [US6] Create Interest API route — `POST /api/events/:id/interest` (toggle, Member auth) in `src/app/api/events/[id]/interest/route.ts`
- [ ] T053 [US6] Build InterestButton component (heart/star toggle) that calls the interest API and updates count optimistically in `src/components/events/InterestButton.tsx`
- [ ] T054 [US6] Integrate InterestButton into EventCard at `src/components/events/EventCard.tsx` and EventDetailPage at `src/app/events/[id]/page.tsx`
- [ ] T055 [US6] Ensure "Interested" status filter works in `listEvents()` query builder — filter to events where caller has an event_interests row, already wired via the status=interested filter in Phase 4

**Checkpoint**: Interest toggle works. Count updates. "Interested" filter returns correct results.

---

## Phase 9: User Story 7 — Share an Event (Priority: P1)

**Goal**: Users can copy a shareable URL or download an .ics calendar file from the event detail page.

**Independent Test**: Click "Share" — URL copied to clipboard. Click "Add to Calendar" — .ics file downloads and opens in Google Calendar / Apple Calendar / Outlook.

### Implementation

- [ ] T056 [P] [US7] Implement .ics generation — `generateEventIcs(event, venue)` using `ical-generator` with timezone support per R-6 in `src/lib/events/ics.ts`
- [ ] T057 [P] [US7] Create .ics API route — `GET /api/events/:id/ics` returning `text/calendar` with `Content-Disposition: attachment` in `src/app/api/events/[id]/ics/route.ts`
- [ ] T058 [US7] Build ShareButton component with "Copy Link" (using Clipboard API) and "Add to Calendar" (.ics download link) in `src/components/events/ShareButton.tsx`
- [ ] T059 [US7] Integrate ShareButton into EventDetailPage at `src/app/events/[id]/page.tsx`

**Checkpoint**: .ics downloads correctly. Shareable URL copies to clipboard. OG meta tags (from T033) enable rich social previews.

---

## Phase 10: Event Creator Operations (Cross-cutting)

**Purpose**: Event editing and cancellation flows that affect multiple stories. These depend on the core event + RSVP infrastructure from Phases 3–6.

- [ ] T060 Implement Event service — `updateEvent(eventId, userId, data)` with owner/admin check via `withPermission('editEvent', ...)` and edge case handling (capacity reduction below current RSVPs shows warning, does not remove RSVPs) in `src/lib/events/service.ts`
- [ ] T061 Implement Event service — `cancelEvent(eventId, userId)` — cancels all active RSVPs, initiates async Stripe refunds for paid RSVPs (not credits), queues notifications to all attendees + interested users per R-5 Path C in `src/lib/events/service.ts`
- [ ] T062 Create Event mutation API routes — `PATCH /api/events/:id` (edit, Owner/Admin auth) and `DELETE /api/events/:id` (cancel, Owner/Admin auth) in `src/app/api/events/[id]/route.ts`
- [ ] T063 Add freshness badges logic — extend `listEvents()` to compute `isNew` and `isUpdated` flags by comparing `created_at` / `updated_at` against caller's `last_login_at` per R-10, and add badge rendering to EventCard in `src/components/events/EventCard.tsx`

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: UX improvements, performance, accessibility, and i18n compliance that span multiple stories.

- [ ] T064 [P] Add loading states (skeleton cards) to EventsListPage and EventDetailPage per Constitution V
- [ ] T065 [P] Add error boundary and error states to all async operations (API failures, geolocation errors) per Constitution V
- [ ] T066 [P] Extract all user-facing strings to i18n keys — ensure no raw string literals in UI components per Constitution VIII and QG-9
- [ ] T067 [P] Format all currency displays with `Intl.NumberFormat` and all date/time displays with `Intl.DateTimeFormat` respecting event timezone per Constitution VIII
- [ ] T068 [P] Ensure all interactive elements are keyboard navigable and touch targets meet 44×44px minimum per Constitution V (WCAG 2.1 AA)
- [ ] T069 Verify images use WebP/AVIF with lazy loading below fold, and map is lazy-loaded via `next/dynamic` per Constitution VI
- [ ] T070 Run quickstart.md validation — execute all setup steps, seed data, verify API endpoints respond, and confirm test commands work

---

## Dependencies & Execution Order

### Cross-Spec Dependencies

| Dependency | Direction | Impact |
|---|---|---|
| Spec 004 → 001 | **Blocks all work** | Auth, permissions middleware, Stripe Connect, users table must exist |
| 001 → Spec 003 | Downstream | Event has nullable `recurrence_rule`, RSVP/Waitlist have nullable `occurrence_date` — extension points ready |
| 001 → Spec 005 | Downstream | No FK on events — Spec 005 adds `event_teachers` junction table independently |
| 001 → Spec 002 | Downstream | City entity shared — Spec 002 uses same cities table |

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────► Phase 2 (Foundational)
                                                 │
                                                 ▼
               ┌─────────────────────────────────┼─────────────────────────────┐
               │                                 │                             │
         Phase 3 (US1: Browse)            Phase 4 (US2: Filter)        Phase 5 (US3: Detail)
               │                                 │                             │
               └─────────┬───────────────────────┘                             │
                         │                                                     │
                         ▼                                                     │
               Phase 6 (US4: RSVP) ◄──────────────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        Phase 7     Phase 8     Phase 9
       (US5:Wait)  (US6:Int)   (US7:Share)
              │          │          │
              └──────────┼──────────┘
                         ▼
               Phase 10 (Creator Ops)
                         │
                         ▼
               Phase 11 (Polish)
```

- **Phase 1 → Phase 2**: Sequential — migration must run before types and services
- **Phase 2**: All [P]-marked tasks can run in parallel
- **Phase 3 (US1: Browse)**: Depends on Phase 2 (city/venue services, event types)
- **Phase 4 (US2: Filter)**: Depends on Phase 3 (`listEvents()` base implementation)
- **Phase 5 (US3: Detail)**: Depends on Phase 2 (can start in parallel with Phase 3/4)
- **Phase 6 (US4: RSVP)**: Depends on Phase 3 (event service) and Phase 5 (detail page)
- **Phase 7, 8, 9**: All depend on Phase 6 (RSVP infrastructure) but are independent of each other — can run in **parallel**
- **Phase 10**: Depends on Phase 6 (RSVP + payment for refund logic)
- **Phase 11**: Depends on all previous phases

### Within Each User Story

- Types/schemas before services
- Services before API routes
- API routes before UI components
- Core implementation before integration into pages
- Story complete → checkpoint before moving to next priority

### Parallel Opportunities

- **Phase 2**: T006, T007, T008, T009 (all type files) in parallel; T010 after types complete; T013 + T015 in parallel with T011/T012/T014
- **Phase 5**: T028, T029, T030, T031 (all display components) in parallel
- **Phases 7 + 8 + 9**: Independent stories, can be worked simultaneously by different developers
- **Phase 11**: T064, T065, T066, T067, T068 all in parallel (different concerns/files)

---

## Parallel Example: Phase 5 (US3: Detail)

```text
# Session A (components):
T028 — EventMap component (Leaflet lazy-loaded)
T029 — MapLinks component (external URLs)
T030 — RoleBreakdown component
T031 — AttendeeList component

# Session B (API + page, after T027):
T027 — Event detail API route
T032 — EventDetailPage (integrates all components)
T033 — OG meta tags via generateMetadata()
```

---

## Implementation Strategy

### MVP First (User Stories 1–4)

1. Complete Phase 1: Setup (migration + seeds)
2. Complete Phase 2: Foundational (types, validation, city/venue services)
3. Complete Phase 3: US1 — Browse Events → **Can demo event browsing**
4. Complete Phase 4: US2 — Filter Events → **Filters work, bookmarkable URLs**
5. Complete Phase 5: US3 — Detail Page → **Full event details visible**
6. Complete Phase 6: US4 — RSVP → **Core RSVP lifecycle works** → **MVP COMPLETE**
7. **STOP and VALIDATE**: Run all P0 flows end-to-end

### Incremental Delivery (P1 Stories)

7. Phase 7 (US5: Waitlist) → Adds capacity overflow handling
8. Phase 8 (US6: Interest) → Adds watchlist / tracking
9. Phase 9 (US7: Share) → Adds .ics export and share URL
10. Phase 10 (Creator Ops) → Event edit/cancel with refund automation
11. Phase 11 (Polish) → Loading states, a11y, i18n, performance validation

---

## Summary

| Metric | Value |
|--------|-------|
| **Total tasks** | 70 |
| **Phase 1 (Setup)** | 4 tasks |
| **Phase 2 (Foundational)** | 11 tasks |
| **Phase 3 (US1: Browse)** | 8 tasks |
| **Phase 4 (US2: Filter)** | 3 tasks |
| **Phase 5 (US3: Detail)** | 7 tasks |
| **Phase 6 (US4: RSVP)** | 11 tasks |
| **Phase 7 (US5: Waitlist)** | 6 tasks |
| **Phase 8 (US6: Interest)** | 5 tasks |
| **Phase 9 (US7: Share)** | 4 tasks |
| **Phase 10 (Creator Ops)** | 4 tasks |
| **Phase 11 (Polish)** | 7 tasks |
| **Parallel opportunities** | 28 tasks marked [P] |
| **MVP scope** | Phases 1–6 (37 tasks, US1–US4) |
| **Suggested MVP milestone** | End of Phase 6 — full RSVP lifecycle |

---

## Notes

- All tasks assume Spec 004 is fully implemented (auth, permissions, Stripe Connect, users table)
- `withPermission()` calls reference Spec 004's middleware — do NOT duplicate
- `occurrence_date` fields are nullable — populated later by Spec 003 (Recurring/Multi-Day)
- No `event_teachers` FK on events — Spec 005 adds its own junction table
- Commit after each task or logical group
- Stop at any checkpoint to validate the current story independently
