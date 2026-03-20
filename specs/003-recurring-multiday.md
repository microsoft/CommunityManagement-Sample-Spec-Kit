# Feature Spec 003: Recurring & Multi-Day Events

> Priority: P1 — Required for regular community classes and festivals
> Status: Implemented
> Constitution check: Principles I, II, IV, VII, XI, XII

## User Scenarios & Testing

### US-1: Create a Weekly Recurring Class (P0)

**As** an event creator running a weekly AcroYoga class,
**I want** to create one event with a weekly recurrence rule,
**So that** all future occurrences appear automatically without me creating each one.

**Given** I am creating an event,
**When** I set frequency to "weekly" on Tuesdays with no end date,
**Then** the event appears on every future Tuesday in the events list and calendar, each occurrence with its own RSVP.

### US-2: RSVP to a Specific Occurrence (P0)

**As** a community member,
**I want** to RSVP to specific occurrences of a recurring event,
**So that** the organiser knows exactly which weeks I'm attending.

**Given** a weekly class exists,
**When** I view the events list,
**Then** I see each upcoming occurrence as a separate entry with its own attendee count, and I can RSVP to each independently.

### US-3: Cancel or Edit a Single Occurrence (P1)

**As** an event creator,
**I want** to cancel or modify one occurrence of a recurring event without affecting the entire series,
**So that** I can handle venue changes, holidays, or schedule adjustments.

**Given** I own a recurring event,
**When** I edit occurrence on March 15 to change the venue,
**Then** only March 15 shows the new venue; all other occurrences are unaffected.

**Given** I cancel the March 22 occurrence,
**When** a user views the event series,
**Then** March 22 does not appear; March 29 and beyond are unaffected; RSVP'd attendees for March 22 are notified.

### US-4: Multi-Day Festival with Per-Day and Combined Tickets (P1)

**As** a festival organiser running a 3-day AcroYoga festival,
**I want** to offer per-day tickets and a discounted full-festival pass,
**So that** attendees can choose the option that suits them.

**Given** I create an event group of type "festival" spanning Friday–Sunday,
**When** I set up ticket types,
**Then** I can define: Friday-only (£30), Saturday-only (£40), Sunday-only (£30), and Full Weekend (£80, capacity 50).

**Given** an attendee buys a Full Weekend ticket,
**When** capacities are updated,
**Then** each of Friday, Saturday, and Sunday decrements one spot from their per-day capacity, and the Full Weekend pool decrements by one.

**Given** Saturday is full (individual + festival passes combined),
**When** another user tries to buy a Saturday-only or Full Weekend ticket,
**Then** Saturday-only is shown as "Sold Out" and Full Weekend is also unavailable (because it includes Saturday).

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Recurrence rules: daily, weekly, monthly with optional end date and occurrence count | P0 |
| FR-02 | Occurrences are virtual — expanded from recurrence rule at query time, not stored as rows. `nextOccurrence` computed at query time for sorting and display | P0 |
| FR-03 | Per-occurrence RSVP: each occurrence is independently RSVP-able. RSVPs and overrides keyed by composite `(eventId, occurrenceDate)` | P0 |
| FR-04 | Series edit: edit all future occurrences or single occurrence | P1 |
| FR-05 | Series cancel: cancel all future or single occurrence with attendee notification | P1 |
| FR-06 | Event groups (type: festival/combo/series) linking multiple events or days | P1 |
| FR-07 | Ticket types per group: independent capacity pools, cost, concession cost. Concession pricing only available to users with admin-approved concession status on their profile. If concession cost is null/not set on a ticket type, concession option is not shown | P1 |
| FR-08 | Cross-capacity validation: combined ticket cannot exceed any individual day's remaining capacity | P1 |
| FR-09 | Teacher revenue splits: deferred to v2. All ticket revenue goes to the event creator's Stripe account. Teachers are paid out-of-band by the creator | P2 |
| FR-10 | Festival/group ticket cancellation follows spec 001 refund policy: creator-defined refund window, credit preferred over refund. Combined tickets (e.g., full-weekend pass) are atomic — cancel the whole pass or keep it; no partial day drop. User must cancel and rebook individual days if they want partial attendance | P1 |
| FR-11 | Concession status: users apply on their profile; scoped admin approves/rejects. Approved users see concession pricing at checkout for all events. Status can be revoked by admin | P1 |
| FR-12 | Single currency per event or event group. Creator sets currency (ISO 4217) at event/group level; all ticket types inherit it. Aligns with Stripe Connect Standard settlement currency. No cross-currency ticket mixing | P0 |

### Key Entities

- **RecurrenceRule**: frequency (daily/weekly/monthly), interval, daysOfWeek, endDate, occurrenceCount
- **OccurrenceOverride**: eventId, occurrenceDate (composite key with eventId), overrideType (cancelled/modified), modifiedFields (JSON)
- **EventGroup**: id, name, type (festival/combo/series), description, startDate, endDate, currency (ISO 4217)
- **EventGroupMember**: groupId, eventId, sortOrder
- **TicketType**: id, groupId, name, cost, concessionCost, capacity, description (currency inherited from EventGroup)
- **Booking**: id, ticketTypeId, userId, pricingTier (standard/concession), paymentStatus, bookedAt
- **ConcessionStatus**: id, userId, status (pending/approved/revoked), approvedBy, approvedAt, revokedAt

### Edge Cases

- Recurring event with no end date: system computes occurrences up to a configurable horizon (default: 12 weeks ahead)
- Recurrence rule change: only affects future occurrences; past RSVPs remain unchanged
- Festival day capacity reduced after tickets sold: show warning to organiser; do not cancel existing bookings
- Timezone edge case: recurring event crosses DST boundary; occurrences should stay at the same local time
- User books per-day ticket then wants to upgrade to full festival: swap booking, adjust capacities atomically
- User cancels full-weekend pass: all per-day capacity slots are released atomically; refund/credit per spec 001 policy
- User wants to drop one day from a combined pass: must cancel entire pass and rebook desired individual days (no partial cancellation)
