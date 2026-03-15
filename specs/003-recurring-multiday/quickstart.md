# Quickstart: Recurring & Multi-Day Events

**Spec**: 003 | **Date**: 2026-03-15

---

## Prerequisites

- Node.js 20+
- PostgreSQL (or PGlite for tests — handled automatically)
- Stripe test account with Connect enabled (from Spec 004 setup)
- Microsoft Entra External ID tenant configured (from Spec 004 setup)
- Spec 004 migrations applied (`004_permissions.sql`)
- Spec 001 migrations applied (`001_events.sql`) — events table with `recurrence_rule` column

## Setup

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Install new dependency for RRULE parsing
npm install rrule

# 3. Ensure environment variables are set (extends .env.local from 004/001)
# Existing from 004:
#   DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, STRIPE_WEBHOOK_SECRET
#   NEXTAUTH_SECRET, ENTRA_CLIENT_ID, ENTRA_TENANT_ID
# Existing from 001:
#   NEXT_PUBLIC_BASE_URL=http://localhost:3000
# New for 003:
#   RECURRENCE_HORIZON_WEEKS=12   (default; how far ahead to expand virtual occurrences)

# 4. Run database migrations (003 depends on 001 and 004)
npm run db:migrate

# 5. Start development server
npm run dev
```

## Running Tests

```bash
# All 003 integration tests (uses PGlite — no external DB needed)
npm run test -- tests/integration/recurrence/
npm run test -- tests/integration/event-groups/
npm run test -- tests/integration/bookings/
npm run test -- tests/integration/concessions/

# Specific test file
npm run test -- tests/integration/recurrence/occurrence-expansion.test.ts
npm run test -- tests/integration/bookings/cross-capacity.test.ts

# E2E tests (requires running dev server)
npm run dev &
npm run test:e2e -- tests/e2e/recurring-class.spec.ts
npm run test:e2e -- tests/e2e/festival-booking.spec.ts
```

## Key Concepts

### Recurring Event Lifecycle

```
Creator creates event with recurrenceRule (requires Event Creator permission from 004)
  → Event is published with RRULE stored in events.recurrence_rule
  → Occurrences are virtual — expanded at query time from RRULE
  → Members RSVP to specific occurrences via (eventId, occurrenceDate) key
  → Creator can override single occurrences (cancel/modify one date)
  → Creator can edit series (all future) or cancel series
```

### Virtual Occurrence Expansion

```
1. Event has recurrence_rule = "FREQ=WEEKLY;BYDAY=TU"
2. API request: GET /api/events/:id/occurrences?from=2026-03-15&to=2026-06-09
3. Server: rrule.js expands RRULE → [Mar 17, Mar 24, Mar 31, ...]
4. Server: loads occurrence_overrides → filters cancelled, merges modified
5. Server: loads RSVP counts per occurrence → attaches confirmedCount
6. Returns: array of Occurrence objects, one per expanded date
```

### Event Group / Festival Lifecycle

```
Creator creates individual day events (via Spec 001)
  → Creator creates event group (type: 'festival')
  → Creator adds events as group members
  → Creator defines ticket types:
     - "Friday Only" → covers Friday event, £30, cap 100
     - "Saturday Only" → covers Saturday event, £40, cap 100
     - "Full Weekend" → covers all events, £80, cap 50
  → Attendees book tickets; cross-capacity validated atomically
  → Capacity = individual RSVPs + group bookings covering that day
```

### Booking Flow (Group Ticket)

```
1. User views event group detail page
2. Selects ticket type (e.g., "Full Weekend Pass")
3. If user has approved concession status AND ticket has concession price → concession tier
4. Server: BEGIN transaction
5.   Lock all covered event rows (SELECT FOR UPDATE, ordered by ID)
6.   Check each day's effective capacity (individual RSVPs + existing bookings)
7.   Check ticket type pool capacity
8.   Apply credits (from Spec 001, FIFO, scoped to group creator)
9.   Charge remainder via Stripe Connect
10.  INSERT booking
11. COMMIT
12. Confirmation with "Cancel Booking" option
```

### Cross-Capacity Example

```
Festival: Fri, Sat, Sun (each with capacity 100)
Ticket types:
  - "Friday Only"  (covers Fri, cap unlimited)
  - "Saturday Only" (covers Sat, cap unlimited)
  - "Full Weekend"  (covers all, cap 50)

State after sales:
  - 80 individual Fri tickets sold
  - 40 Full Weekend passes sold (each occupies 1 slot on Fri, Sat, Sun)

Effective occupancy:
  - Friday:   80 + 40 = 120? NO — this would exceed 100. 
  - Actual: The 40th Full Weekend was allowed because at the time:
    Friday had 80 + 39 = 119 < 120... wait, this exceeds 100.

Corrected: Cross-capacity check happens at booking time.
  If Fri has 60 individual + 40 weekend = 100 → Saturday-only still available,
  but Full Weekend and Friday-only are both sold out.
```

### Concession Status Flow

```
1. User applies for concession status: POST /api/concessions/me
2. Scoped admin reviews: PATCH /api/admin/concessions/:id { action: 'approve' }
3. At checkout — any event or group ticket:
   - Server checks: does user have approved concession status?
   - Does this ticket/event have a concession price?
   - If both → concession price applied automatically
4. Admin can revoke concession status at any time
```

### Cancellation Rules

| Scenario | Action |
|----------|--------|
| Individual occurrence RSVP (recurring) | Standard Spec 001 cancel flow for that occurrence |
| Single occurrence cancelled by creator | Override with type='cancelled'; notify RSVP'd attendees |
| Entire series cancelled | Event set to 'cancelled'; all future RSVPs refunded |
| Group ticket (Full Weekend) | ATOMIC: cancel entire pass, release all day capacities |
| Partial day drop from combined pass | NOT SUPPORTED: cancel pass, rebook individual days |
| Creator deletes event group | Cascades: cancel all bookings, auto-refund |

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Virtual occurrences (not stored) | FR-02 mandate. Avoids data management overhead. RRULE is source of truth. |
| `rrule.js` for expansion | Known-hard problem (RFC 5545, DST, BYSETPOS). ~15KB. MIT. Principle VII exception. |
| Overrides as `(event_id, date)` patches | Industry standard (Google Calendar pattern). Simple, queryable, composable. |
| Group ticket types separate from event pricing | Combined passes span multiple events. Can't model "Full Weekend" as a single event. |
| Cross-capacity via SELECT FOR UPDATE | Same pattern as Spec 001. Deterministic lock ordering prevents deadlocks. |
| Concession as user-level attribute (not per-event) | Spec FR-11: "approved users see concession pricing at checkout for all events." |
| Revenue splits deferred to v2 | FR-09 explicitly defers. Reduces scope. All revenue to group creator. |
