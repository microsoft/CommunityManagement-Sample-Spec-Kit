# Research: Recurring & Multi-Day Events

**Spec**: 003 | **Date**: 2026-03-15

---

## R-1: Virtual Occurrence Expansion (RFC 5545 RRULE)

**Decision**: Use the `rrule` npm package (part of `rrule.js`, MIT, actively maintained) to parse RFC 5545 RRULE strings stored in `events.recurrence_rule` and expand them to concrete dates at query time. Occurrences are never materialised as rows — the expansion happens in the service layer, bounded by a configurable horizon (default 12 weeks ahead).

**Rationale**: FR-02 mandates virtual occurrences — "expanded from recurrence rule at query time, not stored as rows." RFC 5545 RRULE is the calendar industry standard (used by Google Calendar, Apple Calendar, Outlook). Storing the rule as a text string preserves compatibility with `.ics` export (Spec 001's `ical-generator` already supports RRULE).

**Implementation**:
```typescript
import { RRule, RRuleSet } from 'rrule';

function expandOccurrences(
  event: Event,
  horizonWeeks: number = 12
): Date[] {
  if (!event.recurrenceRule) return [event.startDatetime];
  
  const rule = RRule.fromString(event.recurrenceRule);
  const now = new Date();
  const horizon = addWeeks(now, horizonWeeks);
  
  // Get occurrence dates within horizon
  const dates = rule.between(now, horizon, true);
  
  // Exclude cancelled overrides
  const cancelledDates = await getCancelledOverrides(event.id);
  return dates.filter(d => !cancelledDates.has(toDateKey(d)));
}
```

**RRULE string examples**:
- Weekly on Tuesdays: `FREQ=WEEKLY;BYDAY=TU`
- Weekly on Tuesdays, ending after 20 occurrences: `FREQ=WEEKLY;BYDAY=TU;COUNT=20`
- Daily for 5 days: `FREQ=DAILY;COUNT=5`
- Monthly on the 15th, until Dec 2026: `FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20261231T235959Z`

**Alternatives considered**:
- **Store occurrences as rows**: Simpler reads but violates FR-02. Creates data management issues — adding/editing RRULE requires insert/delete of many rows. Spec 001's `rsvps` table already has `occurrence_date` for the composite key, so virtual expansion is the design.
- **Custom recurrence parser**: RFC 5545 RRULE has many edge cases (BYSETPOS, EXDATE, WKST). Writing a custom parser would be > 500 lines and error-prone. The `rrule` package handles all RFC 5545 features.
- **PostgreSQL-side expansion (generate_series + custom logic)**: Could expand dates in SQL for listing queries. But RRULE parsing in SQL is complex and hard to test. Service-layer expansion is simpler, testable, and keeps business logic in TypeScript.

**Dependency justification** (Principle VII): `rrule.js` — MIT, actively maintained, ~15KB gzipped, eliminates a known-hard problem (RFC 5545 recurrence with timezone, DST, BYSETPOS, EXDATE). This is well within the "known-hard problem" exception.

**PGlite compatibility**: All expansion happens in TypeScript — no PostgreSQL extensions required. PGlite only stores/retrieves the RRULE string and override rows.

---

## R-2: DST Handling for Recurring Events

**Decision**: Store the event's `start_datetime` as `timestamptz` (already done in Spec 001) and the event's venue timezone via `cities.timezone` (IANA identifier). When expanding occurrences, compute each occurrence's start time in the venue's local timezone, then convert to UTC. This ensures "every Tuesday at 7pm London time" stays at 7pm local time even across DST boundaries.

**Rationale**: The spec states "occurrences should stay at the same local time" across DST boundaries. RFC 5545 DTSTART with TZID handles this — the `rrule.js` library supports timezone-aware expansion via the `tzid` option.

**Implementation**:
```typescript
import { RRule } from 'rrule';

function expandWithTimezone(
  event: Event,
  venueTimezone: string, // e.g. "Europe/London"
  horizonWeeks: number
): Date[] {
  const rule = RRule.fromString(event.recurrenceRule);
  // rrule.js expands in the DTSTART timezone by default
  // We set DTSTART to the local time, rrule expands in that zone
  const dates = rule.between(now, horizon, true);
  // Each date is in UTC but represents the correct local time
  return dates;
}
```

**Key edge cases**:
- **Spring forward (clocks skip 1h)**: If event is at 1:30am and clocks skip 1:00–2:00am, occurrence is pushed to 2:30am (the next valid time). `rrule.js` handles this per RFC 5545.
- **Fall back (clocks repeat 1h)**: If event is at 1:30am during an ambiguous hour, `rrule.js` uses the first (earlier) occurrence by default. This is the expected behaviour for regular classes.
- **Cross-timezone attendees**: The API returns `timestamptz` values — the client formats in the user's local timezone. The event happens at a physical venue, so the venue timezone is authoritative.

**Alternatives considered**:
- **Store as local time without timezone**: Loses the ability to correctly compute UTC timestamps for API consumers and calendar sync. Would require client-side timezone inference.
- **Luxon or date-fns-tz for expansion**: These are date libraries, not RRULE expanders. We need `rrule.js` for the expansion logic; Luxon/date-fns-tz could supplement for formatting, but `Intl.DateTimeFormat` (already mandated by Constitution VIII) is sufficient.

---

## R-3: Occurrence Override Storage Pattern

**Decision**: A dedicated `occurrence_overrides` table with composite key `(event_id, occurrence_date)`. Each override is either `cancelled` or `modified`. Modified overrides store a JSON blob of changed fields (e.g., venue, time, description). At query time, the expansion service merges overrides onto expanded occurrences.

**Rationale**: FR-04 requires editing "all future occurrences or single occurrence." FR-05 requires cancelling single occurrences. The override pattern (used by Google Calendar, Apple Calendar) is the standard approach: the RRULE generates the default series, and overrides patch individual dates.

**Implementation**:
```typescript
// Occurrence expansion with overrides
function getOccurrences(event: Event, horizon: Date): Occurrence[] {
  const baseDates = expandRRule(event.recurrenceRule, event.startDatetime, horizon);
  const overrides = await getOverrides(event.id);
  
  return baseDates
    .filter(date => !overrides.isCancelled(date))
    .map(date => ({
      eventId: event.id,
      occurrenceDate: toDateKey(date),
      ...event, // base event fields
      ...overrides.getModifications(date), // override fields (if any)
    }));
}
```

**Modified field storage**: The `modified_fields` JSONB column stores only the changed fields:
```json
{
  "venue_id": "uuid-of-new-venue",
  "start_datetime": "2026-03-15T19:30:00Z",
  "end_datetime": "2026-03-15T21:30:00Z"
}
```
This is a partial patch — only specified fields override the base event. Unspecified fields inherit from the parent event.

**Allowed override fields**: `venue_id`, `start_datetime`, `end_datetime`, `capacity`, `description`, `status`. Price changes on a single occurrence are NOT supported (price is series-wide to avoid confusion). Validated by a Zod schema on the `modified_fields` JSON.

**Alternatives considered**:
- **Store each modified occurrence as a full event row**: Duplicates data, breaks the single-source-of-truth for the series. Hard to propagate "edit all future" changes.
- **Store diffs as a JSON patch (RFC 6902)**: More general but harder to validate and query. A simple key-value patch of known fields is sufficient.
- **EAV (entity-attribute-value) pattern**: Over-engineered for a handful of overridable fields.

---

## R-4: Event Group Data Model (Festivals, Combos, Series)

**Decision**: An `event_groups` table with a `type` enum (`festival`, `combo`, `series`) linking multiple events via a junction table `event_group_members`. Each group has its own currency (ISO 4217), date range, and description. Ticket types are defined per group (not per event) enabling cross-event passes like "Full Weekend."

**Rationale**: FR-06 requires "Event groups (type: festival/combo/series) linking multiple events or days." The three types serve different use cases:
- **Festival**: Multi-day event at one location (e.g., 3-day AcroYoga festival). Days are separate events; group offers combined passes.
- **Combo**: Bundle of unrelated events by the same creator (e.g., "Workshop + Jam combo ticket").
- **Series**: A thematic grouping (e.g., "Spring Term Fundamentals") — no combined ticketing, purely organisational.

**Key design decisions**:
- Groups own ticket types (not individual events) because combined passes span multiple events
- Each member event retains its own individual-event capacity and pricing from Spec 001
- Group-level ticket types have their own, separate capacity pools
- Currency is set at the group level and inherited by all ticket types (FR-12)
- Group creator must be the creator of all member events (resource ownership, Principle XI)

**Alternatives considered**:
- **Single `events` table with parent_id self-reference**: Simpler for festivals but doesn't model "combo" (unrelated events grouped) or differentiate group types. Also conflates group metadata (date range, group ticket types) with event metadata.
- **Denormalised ticket types on each event**: Loses the "Full Weekend pass spans 3 days" concept. Ticket types must be at the group level for cross-event passes.
- **Separate tables per group type**: Violates DRY. All three types share the same structure; only business rules differ (e.g., combos don't require contiguous dates).

---

## R-5: Cross-Capacity Validation (Atomic)

**Decision**: When booking a combined ticket (e.g., Full Weekend pass), validate that every constituent day has remaining capacity in a single transaction with `SELECT FOR UPDATE` on all affected event rows. This is an extension of Spec 001's atomic capacity pattern. The booking service locks all member events, checks each day's remaining capacity (individual tickets + group ticket allocations), and either commits all or rejects.

**Rationale**: FR-08 mandates "combined ticket cannot exceed any individual day's remaining capacity." Constitution XII mandates "cross-capacity booking MUST be validated atomically in a single transaction."

**Implementation**:
```typescript
async function bookGroupTicket(
  ticketTypeId: string,
  userId: string,
  tx: Transaction
): Promise<Booking> {
  // 1. Load ticket type and its group's member events
  const ticketType = await getTicketType(ticketTypeId, tx);
  const group = await getEventGroup(ticketType.groupId, tx);
  const memberEvents = await getGroupMembers(group.id, tx);
  
  // 2. Determine which member events this ticket type covers
  const coveredEvents = resolveCoveredEvents(ticketType, memberEvents);
  
  // 3. Lock ALL covered events (SELECT FOR UPDATE, ordered by ID to prevent deadlock)
  const lockedEvents = await lockEvents(
    coveredEvents.map(e => e.eventId),
    tx
  );
  
  // 4. For each covered event, check remaining capacity
  for (const event of lockedEvents) {
    const used = await getEffectiveAttendeeCount(event.id, group.id, tx);
    if (used >= event.capacity) {
      throw new CapacityExceededError(event.id, event.title);
    }
  }
  
  // 5. Check ticket type's own pool capacity
  const ticketsSold = await getTicketTypeSoldCount(ticketTypeId, tx);
  if (ticketType.capacity && ticketsSold >= ticketType.capacity) {
    throw new TicketTypeSoldOutError(ticketTypeId);
  }
  
  // 6. INSERT booking
  return await insertBooking({ ticketTypeId, userId, ... }, tx);
}
```

**Deadlock prevention**: Events locked in deterministic order (sorted by UUID). This ensures that concurrent bookings for different ticket types in the same group don't deadlock.

**Effective attendee count**: For a given event day, the count is:
- Individual RSVPs for that event (from Spec 001)
- Plus bookings for group ticket types that cover this event

This is computed by joining `rsvps` and `bookings` (through ticket type → group → member events).

**Alternatives considered**:
- **Optimistic locking with retry**: Check capacity, insert booking, verify no over-commit in a check constraint. More complex retry logic. `SELECT FOR UPDATE` is simpler and PostgreSQL-idiomatic (same pattern as Spec 001).
- **Materialised capacity counters**: Maintain a `remaining_capacity` column on events, decrement atomically. Introduces sync issues when bookings are cancelled or group membership changes. Derived count is simpler (Principle VII).
- **Advisory locks**: `pg_advisory_xact_lock(eventId)` for each event. Works but `SELECT FOR UPDATE` on event rows is clearer and already established in Spec 001.

---

## R-6: Ticket Booking & Payment Flow

**Decision**: Group ticket purchases use Stripe Connect Standard (direct charge to event group creator's Stripe account), reusing Spec 004's `stripe-connect.ts` integration. The checkout flow:

1. User selects ticket type → API validates availability
2. If user has concession status and ticket has concession price → apply concession
3. Auto-apply creator-scoped credits (from Spec 001's credit system, FIFO)
4. Charge remainder via Stripe Connect (direct charge to creator)
5. Create booking row within the same transaction

**Rationale**: FR-09 says "All ticket revenue goes to the event creator's Stripe account." This is identical to Spec 001's paid event flow, extended for group tickets. The creator of the event group must have a connected Stripe account (from Spec 004).

**Key differences from Spec 001 RSVP flow**:
- RSVP (Spec 001) is for individual event occurrences → creates an `rsvp` row
- Booking (Spec 003) is for group ticket types → creates a `booking` row
- Both use the same Stripe Connect integration and credit system
- Both require atomic capacity checks

**Concession pricing**: FR-07/FR-11 specify that concession pricing is shown only to users with admin-approved `ConcessionStatus`. At checkout, the server verifies concession eligibility:
```typescript
const price = (user.concessionApproved && ticketType.concessionCost != null)
  ? ticketType.concessionCost
  : ticketType.cost;
```

**Revenue splits deferred**: FR-09 explicitly defers revenue splits to v2. All revenue from group tickets goes to the group creator. Teachers are paid out-of-band.

**Alternatives considered**:
- **Stripe Checkout Sessions**: Redirect to Stripe-hosted checkout page. Adds a redirect, losing the in-app experience. Direct charges via API are simpler for this use case and already established.
- **Separate payment provider for group tickets**: No justification — Stripe Connect Standard handles both individual and group payments identically.

---

## R-7: Concession Status Lifecycle

**Decision**: A `concession_statuses` table on the user profile, managed by scoped admins. Users apply for concession status (self-service), admins approve or reject. Approved users see concession pricing at checkout across all events. Status can be revoked by admin.

**Rationale**: FR-11 specifies concession status as a user-level attribute, approved by scoped admins. This is structurally similar to Spec 004's permission request workflow — self-service application, admin review, status stored on user.

**State machine**:
```
(none) → pending    (user applies)
pending → approved  (admin approves; sets approvedBy, approvedAt)
pending → rejected  (admin rejects; user can reapply)
approved → revoked  (admin revokes; sets revokedAt)
revoked → pending   (user reapplies)
```

**Scope of approval**: A scoped admin (City Admin or higher) can approve/reject concession statuses for users in their scope. Global Admins can approve anyone. This reuses Spec 004's `withPermission('approveConcession', scope)` pattern.

**Checkout integration**: At checkout (both individual RSVP from Spec 001 and group booking from Spec 003), the service checks:
1. Does the user have an active (approved, not revoked) concession status?
2. Does the ticket type / event have a non-null concession cost?
3. If both → apply concession price; otherwise → standard price

**Alternatives considered**:
- **Self-declared concession (no admin approval)**: Simplest but open to abuse. Spec explicitly requires admin approval.
- **Concession as a role in Spec 004's permission_grants**: Conflates financial/social status with access control. Concession is not a permission — it's an attribute affecting pricing. Separate table is cleaner.
- **Per-event concession (creator decides per event)**: Spec says "Approved users see concession pricing at checkout for all events." It's a platform-level attribute, not per-event. The per-event part is just whether `concession_cost` is set on the ticket/event.

---

## R-8: Combined Pass Cancellation Atomicity

**Decision**: Combined passes (e.g., Full Weekend) are cancelled atomically — the entire booking is cancelled, releasing capacity on all covered days. No partial cancellation (user cannot drop one day from a combined pass). Refund follows Spec 001's policy: creator-defined refund window, credit preferred over Stripe refund.

**Rationale**: FR-10 explicitly states "Combined tickets are atomic — cancel the whole pass or keep it; no partial day drop. User must cancel and rebook individual days if they want partial attendance."

**Cancellation flow**:
```
1. User requests booking cancellation
2. Server loads booking, ticket type, and all covered member events
3. Determine refund eligibility:
   - Check if NOW < earliest covered event start - refundWindowHours
   - Refund window is based on the FIRST event in the group (most conservative)
4. BEGIN transaction
5. Mark booking as cancelled
6. Release capacity on all covered events (decrement from effective counts)
7. If within refund window:
   a. User chose "credit" → issue credit (amount = booking price, scoped to creator)
   b. User chose "refund" → Stripe refund via Connect
8. COMMIT
9. Queue cancellation notification
```

**Upgrade flow** (edge case): User has per-day tickets and wants to upgrade to full-festival pass:
```
1. Cancel individual day bookings/RSVPs (each follows its own refund rules)
2. Book full-festival ticket (standard booking flow with capacity check)
3. These are two separate user actions — no atomic "swap" needed
```
This is simple and avoids a complex "upgrade" codepath. Per Principle VII, we defer upgrade atomicity unless user feedback demands it.

**Alternatives considered**:
- **Partial cancellation with prorated refund**: Spec explicitly prohibits. "No partial day drop."
- **Atomic swap (cancel old + book new in one transaction)**: Adds complexity. The two-step approach (cancel, then book) is simpler and the user can see intermediate states (capacity may change). If atomicity becomes a user need, it can be added in v2.

---

## R-9: Configurable Occurrence Expansion Horizon

**Decision**: A server-side configuration value `RECURRENCE_HORIZON_WEEKS` (default: 12, environment variable) controls how far ahead virtual occurrences are expanded. This applies to both event listing queries and the event detail page. The horizon is a platform-wide setting, not per-event.

**Rationale**: The spec says "configurable horizon (default: 12 weeks ahead)." A 12-week window balances:
- **Attendee needs**: Users typically plan 2–3 months ahead for weekly classes
- **Performance**: Expanding 12 weeks of weekly events = 12 occurrences. Even daily events = 84 occurrences. Manageable.
- **Data freshness**: Beyond 12 weeks, future occurrences might change. Shorter horizons reduce stale data.

**API behaviour**:
- `GET /api/events` lists expanded occurrences within the horizon
- `GET /api/events/:id` returns the next N occurrences within the horizon (N configurable, default 12)
- Calendar export (.ics) includes the RRULE itself (not expanded dates), so calendar apps expand natively

**Alternatives considered**:
- **Per-event horizon**: Adds complexity for creators. No user scenario requires it. Platform-wide default is sufficient.
- **Unlimited expansion**: Performance risk for events with no end date. 12 weeks is a safe default.
- **Client-side expansion**: Would require shipping the RRULE parsing library to the browser. Keep expansion server-side (Principle IV).

---

## R-10: Series Edit — "All Future" vs "Single Occurrence"

**Decision**: When an event creator edits a recurring event, they choose between:
1. **Edit this occurrence only** → creates/updates an `occurrence_override` with the modified fields
2. **Edit this and all future occurrences** → updates the base event's fields directly (affects all future expanded dates)

For "edit all future," past overrides are preserved — they represent intentional deviations that should not be reverted by a series-wide change.

**Rationale**: FR-04 requires both edit modes. This is the same pattern used by Google Calendar and Outlook.

**"Edit all future" with RRULE change**: If the creator changes the recurrence pattern (e.g., weekly → biweekly), the service:
1. Updates `events.recurrence_rule` to the new RRULE
2. Removes future occurrence overrides that would no longer align with the new schedule
3. Preserves past overrides (they're historical)

**Alternatives considered**:
- **Split series**: On "edit all future," end the current series and create a new event with the new settings. Used by some calendar apps. Adds complexity (two events, link between old and new series). Simpler to update the base event in place.
- **Versioned RRULE history**: Store all past RRULE strings. Useful for audit but not needed for current requirements. The RRULE represents the current schedule; past occurrences are reconstructable from RSVPs.
