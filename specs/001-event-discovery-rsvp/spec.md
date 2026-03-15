# Feature Spec 001: Event Discovery & RSVP

> Priority: P0 — Core feature, required for MVP
> Status: Draft
> Constitution check: Principles I, II, III, IV, V, VI, VIII

## User Scenarios & Testing

### US-1: Browse Events Without Account (P0)

**As** a visitor who has heard about a local AcroYoga jam,
**I want** to browse upcoming events near me without creating an account,
**So that** I can discover what's happening and decide whether to attend.

**Given** I open the events page with no session,
**When** the page loads,
**Then** I see a list of upcoming events sorted by date, each showing title, date/time, location, category badge, skill level badge, cost, and attendee count.

**Given** my browser provides geolocation consent,
**When** the page loads,
**Then** events are filtered to my nearest city by default, with an option to change location.

### US-2: Filter and Search Events (P0)

**As** a community member looking for a specific type of event,
**I want** to filter events by category, skill level, date range, status, and location,
**So that** I find exactly what I'm looking for quickly.

**Given** I am on the events page,
**When** I select category "Workshop" and skill level "Intermediate",
**Then** only workshops tagged Intermediate (or "All levels") are shown.

**Given** I select a date range using the calendar picker,
**When** the filter is applied,
**Then** only events within that range appear, including individual occurrences of recurring events.

### US-3: View Event Details (P0)

**As** a visitor interested in an event,
**I want** to see full event details including description, location on a map, teacher info, prerequisites, cost, and who's attending,
**So that** I can make an informed decision about attending.

**Given** I click on an event card,
**When** the event detail page loads,
**Then** I see: title, description, date/time (with timezone), location with interactive map and external map links (Google, Apple, OSM, What3Words), category badge, skill level badge, prerequisites (if any), cost with currency, teacher name(s), attendee count with role breakdown (Base/Flyer/Hybrid), list of opted-in attendee names, and "Add to calendar" button.

### US-4: RSVP to an Event (P0)

**As** a logged-in community member,
**I want** to RSVP to an event and specify my role (Base, Flyer, or Hybrid),
**So that** the organiser knows I'm coming and the community can see role balance.

**Given** I am logged in and viewing an event with available capacity,
**When** I click "RSVP" and select my role,
**Then** my RSVP is recorded, attendee count increments, and I see a confirmation with "Add to calendar" and "Cancel RSVP" options.

**Given** the event has prerequisites,
**When** the RSVP form appears,
**Then** I must tick a checkbox confirming I meet the prerequisites before I can submit.

**Given** I cancel my RSVP to a paid event within the creator's refund window,
**When** the cancellation is processed,
**Then** I am offered a choice: receive a credit for a future event by the same creator (preferred/default option) or a full refund to my original payment method via Stripe.

**Given** I cancel my RSVP to a paid event after the refund window has passed,
**When** the cancellation is processed,
**Then** no refund or credit is issued; the cancellation policy and deadline are shown before confirmation.

### US-5: Waitlist When Event is Full (P1)

**As** a community member who wants to attend a full event,
**I want** to join a waitlist and be automatically promoted if a spot opens,
**So that** I don't miss out if someone cancels.

**Given** I am logged in and viewing a full event,
**When** I click "Join Waitlist",
**Then** I am added to the waitlist with my position shown.

**Given** someone cancels their RSVP and I am first on the waitlist,
**When** the cancellation is processed and the organiser's cutoff time has not passed (default: 2 hours before event start),
**Then** I am automatically promoted to RSVP'd status and receive a notification.

**Given** the cutoff time has passed,
**When** a spot opens,
**Then** no auto-promotion occurs; the spot remains open for walk-ins.

### US-6: Mark Interest Without Committing (P1)

**As** a community member browsing events,
**I want** to mark events as "Interested" to track them,
**So that** I can easily find them later and get notified of changes.

**Given** I am logged in and viewing an event,
**When** I click the "Interested" toggle,
**Then** the event is added to my interest list, the interested count increments, and I can filter my events by "Interested".

### US-7: Share an Event (P1)

**As** a community member who found a great event,
**I want** to share it via a link or to my calendar,
**So that** I can invite friends.

**Given** I am viewing an event detail page,
**When** I click "Share",
**Then** I can copy a shareable URL or download an .ics calendar file.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Events list page displays upcoming events sorted by next occurrence date | P0 |
| FR-02 | Events filterable by: location (city), category, skill level, date range, status (new/full/past/booked). **Categories** (enum): Jam, Workshop, Class, Festival, Social, Retreat, Teacher Training. **Skill levels** (enum): Beginner, Intermediate, Advanced, All Levels | P0 |
| FR-03 | Event detail page displays all event metadata including interactive map | P0 |
| FR-04 | Geolocation snaps to the nearest city in the platform city registry that has active events. If no city is within 100km, show all events with a city picker prompt | P0 |
| FR-05 | RSVP requires authentication via Microsoft Entra External ID (social providers: Google, Facebook, Apple); captures role (Base/Flyer/Hybrid) | P0 |
| FR-06 | RSVP enforces capacity as a hard limit server-side for all events (free and paid). Excess RSVPs join waitlist. Creators set capacity; for effectively unlimited events, set a high value. Capacity check is atomic (SELECT FOR UPDATE or equivalent) | P0 |
| FR-07 | Waitlist auto-promotes first-in-line when a spot opens (before organiser cutoff) | P1 |
| FR-08 | "Interested" toggle (watchlist) with filter pill and count display | P1 |
| FR-09 | Event cards show freshness badges: "New" (created since last login), "Updated" (modified since last login) | P1 |
| FR-10 | .ics calendar file generation for any event | P1 |
| FR-11 | Shareable event URL with Open Graph meta tags for rich social previews | P2 |
| FR-12 | Status filter pills (New / Full / Past / Booked / Interested) with OR-logic | P0 |
| FR-13 | Free-text search across event title, description, and location | P2 |
| FR-14 | Role balance display: show count per role, surface "Flyers needed!" style hints when imbalanced | P1 |
| FR-15 | Authentication via Microsoft Entra External ID with social identity providers (Google, Facebook, Apple). No email/password sign-up. Platform deployed on Azure | P0 |
| FR-16 | Session tokens issued as JWTs from Entra; validated server-side on every authenticated request | P0 |
| FR-17 | Event creators set a cancellation/refund window per event (e.g., 24h, 48h, 7d before start). Default: 24h | P0 |
| FR-18 | Within the refund window, cancelling user chooses between: (a) credit toward a future event by the same creator (preferred/default) or (b) full Stripe refund. After the window: no refund or credit | P0 |
| FR-19 | Credits are scoped to a creator, have no expiry, and are automatically applied at checkout for that creator's events | P1 |

### Key Entities

- **Event**: id, title, description, datetime, endDatetime, locationId, category (enum: Jam/Workshop/Class/Festival/Social/Retreat/TeacherTraining), skillLevel (enum: Beginner/Intermediate/Advanced/AllLevels), prerequisites, cost, currency, concessionCost, capacity, refundWindowHours (default 24), isExternal, externalUrl, posterImageUrl, recurrenceRule, createdBy, createdAt, updatedAt
- **City**: id, name, countryId, latitude, longitude, timezone
- **Country**: id, name, continentCode
- **Venue**: id, name, address, cityId, latitude, longitude, createdBy, createdAt
- **RSVP**: id, eventId, userId, occurrenceDate (nullable, for recurring), role, nameVisible, createdAt
- **Waitlist**: id, eventId, userId, position, joinedAt, promotedAt (nullable), cutoffOverride (nullable)
- **EventInterest**: id, eventId, userId, createdAt
- **CancellationPolicy**: refundWindowHours (default 24), refundOptions (credit/refund)
- **Credit**: id, userId, creatorId, amount, currency, remainingBalance, issuedFromEventId, createdAt

### Edge Cases

- User RSVPs then event capacity decreases (admin edit) → do not remove existing RSVPs; show "over capacity" warning to admin
- Recurring event: user RSVPs for one occurrence, event is cancelled for that date → notify user, remove RSVP, do not affect other occurrences
- Geolocation denied → show all events globally with prominent city picker
- Geolocation granted but no platform city within 100km → show all events with city picker prompt; do not silently default to a distant city
- User marks interest then RSVPs → interest record is retained (they may still want to track updates)
- Event has zero cost → RSVP flow skips payment entirely; "Free" displayed instead of cost
- Paid event cancellation within refund window: credit is preferred option (shown first/default); refund is secondary
- Paid event cancellation after refund window: no refund or credit; user sees policy before confirming
- User has existing credit with a creator → credit is auto-applied at checkout, reducing or eliminating the charge
- Creator cancels entire event → all attendees receive automatic full refund (not credit), regardless of refund window

---

## Success Criteria

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-01 | A visitor can find a local event in fewer than 3 interactions (load → optional filter → click) | Manual UX test |
| SC-02 | Events page loads in < 2.5s LCP on simulated 3G | Lighthouse CI |
| SC-03 | RSVP round-trip (click → confirmation) completes in < 1s on broadband | Performance test |
| SC-04 | 100% of RSVP capacity enforcement is server-side; client cannot bypass limits | Integration test: concurrent RSVP at capacity |
| SC-05 | Public event API returns zero PII for users who have not opted in | API contract test |
| SC-06 | All event filters are reflected in the URL as query parameters (bookmarkable/shareable) | E2E test |
| SC-07 | .ics file downloads and opens correctly in Google Calendar, Apple Calendar, Outlook | Manual test on each platform |
