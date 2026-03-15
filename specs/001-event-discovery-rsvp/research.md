# Research: Event Discovery & RSVP

**Spec**: 001 | **Date**: 2026-03-15

---

## R-1: Geolocation Snapping to City Registry

**Decision**: Haversine distance calculation in SQL against the `geography` table (from Spec 004). Client sends `(lat, lon)`, API returns the nearest city with active events within 100km. If no city within 100km, return null and signal the client to show a city picker.

**Rationale**: The spec requires geolocation snap to the "nearest city in the platform city registry that has active events" with a 100km threshold (FR-04). Haversine is the simplest distance function for point-to-point earth distance. The geography table from Spec 004 already has `latitude` and `longitude` — the City entity in Spec 001 extends these fields onto the existing geography rows.

**Implementation**:
```sql
SELECT g.city, g.display_name_city,
       (6371 * acos(cos(radians($lat)) * cos(radians(g.latitude))
       * cos(radians(g.longitude) - radians($lon))
       + sin(radians($lat)) * sin(radians(g.latitude)))) AS distance_km
FROM geography g
WHERE g.id IN (SELECT DISTINCT e.city_id FROM events e WHERE e.start_datetime > now())
ORDER BY distance_km ASC
LIMIT 1;
```
If `distance_km > 100`, return null.

**Alternatives considered**:
- **PostGIS extension**: Full spatial indexing (R-tree) with `ST_DWithin`. Overkill for a registry of hundreds of cities. PostGIS adds deployment complexity and PGlite doesn't support it. Would be justified at 10k+ cities with frequent geo-queries.
- **Client-side distance calculation**: Pre-fetch all cities, calculate in browser. Adds payload weight and can't filter by "cities with active events" without also sending event metadata. Violates server-side authority (Principle IV).
- **Google Geocoding API**: Reverse-geocode lat/lon to city name, then match. External dependency, cost, latency. Our city registry is the source of truth — matching to Google's city names introduces ambiguity.

**PGlite compatibility**: Haversine is pure SQL math functions — works identically in PGlite. No extension required.

---

## R-2: Atomic Capacity Enforcement

**Decision**: `SELECT ... FOR UPDATE` on the event row to lock capacity during RSVP. Within the transaction: read current RSVP count, compare to capacity, INSERT RSVP or reject. Serializable isolation not required — row-level lock is sufficient.

**Rationale**: FR-06 mandates "Capacity check is atomic (SELECT FOR UPDATE or equivalent)" and SC-04 requires "100% of RSVP capacity enforcement is server-side." The flow:

```
BEGIN;
SELECT capacity FROM events WHERE id = $eventId FOR UPDATE;
SELECT COUNT(*) AS current FROM rsvps WHERE event_id = $eventId AND occurrence_date IS NOT DISTINCT FROM $occurrenceDate;
IF current >= capacity THEN ROLLBACK; return { full: true, waitlistAvailable: true };
INSERT INTO rsvps (...);
COMMIT;
```

`FOR UPDATE` locks only the event row, not the entire table. Concurrent RSVP attempts for the same event serialize at the row lock. Different events do not contend.

**Alternatives considered**:
- **Optimistic locking (version column)**: Event has a `version` field; RSVP increments it with a conditional UPDATE. Retries on conflict. Works but adds retry logic. `SELECT FOR UPDATE` is simpler and PostgreSQL-idiomatic.
- **Advisory locks**: `pg_advisory_xact_lock(eventId)` — functional but non-standard and harder to reason about. Row-level lock on the event row is clearest.
- **SERIALIZABLE transaction isolation**: Prevents all concurrency anomalies but adds the risk of serialization failures across unrelated transactions. Overkill when the contention is only on the event row.
- **Application-level mutex (Redis)**: External dependency. PGlite tests can't use it. Database locks are sufficient at this scale.

**PGlite compatibility**: PGlite supports `SELECT FOR UPDATE` within transactions. Integration tests will verify concurrent RSVP at capacity.

---

## R-3: Waitlist Auto-Promotion

**Decision**: When an RSVP is cancelled (and the cancellation frees a spot), a synchronous in-transaction promotion of the first-in-line waitlist entry to an RSVP. This occurs within the same transaction as the cancellation, ensuring atomicity. Promotion is blocked if the event's cutoff time has passed (default: 2h before event start).

**Rationale**: FR-07 requires auto-promotion "when a spot opens" and "before organiser cutoff." The simplest approach is:

```
BEGIN;
DELETE FROM rsvps WHERE id = $rsvpId;
-- Check if promotion is allowed (cutoff not passed)
SELECT start_datetime, waitlist_cutoff_hours FROM events WHERE id = $eventId;
IF now() < start_datetime - interval '$cutoff hours' THEN
  -- Promote first in line
  UPDATE waitlist SET promoted_at = now()
    WHERE event_id = $eventId AND promoted_at IS NULL
    ORDER BY position ASC LIMIT 1
    RETURNING *;
  INSERT INTO rsvps (event_id, user_id, role, ...) VALUES (...);
END IF;
COMMIT;
-- Queue notification to promoted user (async, outside transaction)
```

**Alternatives considered**:
- **Background job / cron**: Check waitlist periodically. Adds delay — user might not be promoted for minutes. The spec implies immediate promotion on cancellation.
- **Event-driven (pub/sub)**: Emit "rsvp.cancelled" event, subscriber promotes. Adds infrastructure. For a synchronous 1:1 promotion, a direct call within the transaction is simpler.
- **Async queue with retry**: Justified if promotion involved external calls (e.g., payment for paid events). For now, promotion of a free RSVP is a DB write. For paid events, the promoted user would need to complete payment — this is handled by setting a `pending_payment` status on the promoted RSVP with a timeout.

**Paid event promotion**: When a waitlisted user is promoted for a paid event, the RSVP is created with status `pending_payment`. A notification is sent with a payment link. If not paid within a configurable window (default: 4h), the RSVP expires and the next waitlisted user is promoted. This secondary promotion runs via a scheduled job.

---

## R-4: Credit System Design

**Decision**: A `credits` table with one row per credit issuance. `remaining_balance` tracks unused amount. At checkout, auto-apply credits from the same creator by consuming from oldest-first (FIFO). Credits have no expiry. Credits are scoped to a creator (not transferable across creators).

**Rationale**: FR-18 specifies credit as the preferred cancellation option. FR-19 specifies: "Credits are scoped to a creator, have no expiry, and are automatically applied at checkout."

**Credit lifecycle**:
1. User cancels paid RSVP within refund window → chooses "credit"
2. System creates a credit row: `{ userId, creatorId, amount: originalPrice, currency, remainingBalance: originalPrice, issuedFromEventId }`
3. User books another event by the same creator → checkout service queries `SELECT * FROM credits WHERE user_id = $userId AND creator_id = $creatorId AND remaining_balance > 0 ORDER BY created_at ASC`
4. Apply credits FIFO, reducing `remaining_balance`. If credits cover the full price, no Stripe charge. If partial, charge the remainder via Stripe.

**Atomicity**: Credit application and Stripe charge happen within a transaction. If Stripe charge fails, credits are not consumed (rollback).

**Alternatives considered**:
- **Wallet model (single balance per user-creator pair)**: Simpler reads (`SELECT balance FROM wallets WHERE ...`) but loses attribution to specific events. The spec's `issuedFromEventId` field implies per-issuance tracking.
- **Stripe credit notes**: Let Stripe handle credits natively. Ties us to Stripe's credit model which doesn't support "scoped to creator" semantics. Also, Stripe credit notes apply to invoices, not direct charges.
- **Platform-wide credits**: Simpler but spec explicitly says "scoped to creator" — a credit from Creator A can't be used for Creator B's events.

---

## R-5: Cancellation & Refund Workflow

**Decision**: Two-path cancellation flow based on refund window:

**Path A — Within refund window** (FR-18):
1. User requests cancellation
2. Server validates `now() < event.start_datetime - interval event.refund_window_hours hours`
3. User chooses: (a) Credit (default/preferred) or (b) Stripe refund
4. Credit path → create credit row, mark RSVP as cancelled
5. Refund path → call `stripe.refunds.create({ charge: originalChargeId })`, mark RSVP as cancelled

**Path B — After refund window** (FR-18):
1. User requests cancellation
2. Server validates window has passed
3. Show cancellation policy (no refund/credit)
4. User confirms → mark RSVP as cancelled. No financial action.

**Path C — Creator cancels entire event** (Edge Case):
1. Creator cancels event → all RSVPs get automatic full Stripe refund (NOT credit)
2. Server iterates all paid RSVPs, issues `stripe.refunds.create()` for each
3. This is async (queued) because there could be many attendees
4. Free event cancellation → RSVPs cancelled, notifications sent, no financial action

**Rationale**: The spec is explicit about the distinction: user-initiated cancellation within window gives choice (credit preferred); creator-initiated full cancellation always gives refund. This prevents creators from using "cancel and re-create" to avoid refunds.

**Alternatives considered**:
- **Credit-only for all cancellations**: Simpler but spec requires refund option within window and mandatory refund on creator cancellation.
- **Automatic refund always**: Simpler but spec prefers credits (reduces Stripe fees, keeps money in ecosystem).
- **Queued refund processing for all**: Could batch. But single-RSVP cancellations should be immediate for UX. Creator event cancellation batches make sense.

---

## R-6: .ics Calendar File Generation

**Decision**: Use the `ical-generator` npm package (MIT, actively maintained) to generate iCalendar (RFC 5545) files server-side. Served via a `/api/events/[id]/ics` GET endpoint.

**Rationale**: FR-10 requires ".ics calendar file generation for any event." SC-07 requires compatibility with Google Calendar, Apple Calendar, and Outlook. `ical-generator` handles timezone encoding, recurrence rules (for Spec 003 future use), and proper escaping.

**Implementation**:
```typescript
import ical from 'ical-generator';

function generateIcs(event: Event, venue: Venue): string {
  const cal = ical({ name: event.title });
  cal.createEvent({
    start: event.startDatetime,
    end: event.endDatetime,
    summary: event.title,
    description: event.description,
    location: `${venue.name}, ${venue.address}`,
    url: `${BASE_URL}/events/${event.id}`,
    timezone: event.timezone,
  });
  return cal.toString();
}
```

Response: `Content-Type: text/calendar; Content-Disposition: attachment; filename=event.ics`

**Alternatives considered**:
- **Manual .ics string building**: Only ~30 lines but timezone handling and escaping are error-prone. The `ical-generator` package is < 50KB and eliminates known edge cases. Justified under Principle VII (avoids a known-hard problem).
- **Client-side generation**: Would work but the .ics URL should be shareable/downloadable directly — server-side is required.

**Dependency justification** (Principle VII): `ical-generator` — actively maintained, MIT license, < 50KB, eliminates timezone and RFC 5545 escaping complexity (a known-hard problem).

---

## R-7: Open Graph Meta Tags for Social Sharing

**Decision**: Server-rendered `<meta>` tags on event detail pages using Next.js `generateMetadata()` in the App Router. Tags include `og:title`, `og:description`, `og:image`, `og:url`, `og:type` (event).

**Rationale**: FR-11 requires "Shareable event URL with Open Graph meta tags for rich social previews." Next.js App Router's `generateMetadata()` is the idiomatic way to set per-page meta tags. No additional dependency needed.

**Implementation**:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const event = await getEvent(params.id);
  return {
    title: event.title,
    description: event.description?.substring(0, 160),
    openGraph: {
      title: event.title,
      description: event.description?.substring(0, 160),
      images: event.posterImageUrl ? [event.posterImageUrl] : [],
      type: 'website',
      url: `${BASE_URL}/events/${event.id}`,
    },
  };
}
```

**Alternatives considered**:
- **react-helmet / next-seo**: Extra dependency for something Next.js handles natively. Not justified.

---

## R-8: Event Filtering & URL Strategy

**Decision**: All filters encoded as URL query parameters. The events list page reads filters from `searchParams` (Next.js App Router server component pattern). Filter state is the URL — no client-side filter state management needed.

**Rationale**: SC-06 requires "All event filters are reflected in the URL as query parameters (bookmarkable/shareable)." Making the URL the source of truth for filters is the simplest approach and aligns with server component hydration.

**URL format**: `/events?city=bristol&category=workshop&skillLevel=intermediate&dateFrom=2026-04-01&dateTo=2026-04-30&status=new,full`

**Filter parameters**:
| Param | Type | Notes |
|-------|------|-------|
| `city` | string | City key from geography |
| `category` | enum[] | Comma-separated: jam, workshop, class, etc. |
| `skillLevel` | enum[] | beginner, intermediate, advanced, all_levels |
| `dateFrom` | ISO date | Start of date range |
| `dateTo` | ISO date | End of date range |
| `status` | enum[] | new, full, past, booked, interested (OR logic per FR-12) |
| `q` | string | Free-text search (FR-13, P2) |
| `page` | number | Pagination offset |

**Server-side**: Query builder constructs WHERE clauses from validated params. Zod validates query params at the API boundary.

**Alternatives considered**:
- **Client-side state + API call**: Filters in React state, `useEffect` triggers API fetch. Breaks bookmarkability without manual URL sync. More code, worse UX.
- **POST body for filters**: Non-standard for read operations. GET with query params is RESTful and cacheable.

---

## R-9: Map Integration

**Decision**: Leaflet with OpenStreetMap tiles. Lazy-loaded (`next/dynamic` with `ssr: false`) on event detail page only. External map links to Google Maps, Apple Maps, OSM, and What3Words.

**Rationale**: FR-03 requires "interactive map" and "external map links." Principle VI requires map library loaded on demand. Leaflet is open-source, no API key required for OSM tiles, and the most lightweight option for a single-marker map.

**Implementation**:
```typescript
const Map = dynamic(() => import('@/components/EventMap'), { ssr: false });
```

External links are simple URL templates — no library needed:
- Google Maps: `https://www.google.com/maps/search/?api=1&query={lat},{lon}`
- Apple Maps: `https://maps.apple.com/?ll={lat},{lon}`
- OSM: `https://www.openstreetmap.org/?mlat={lat}&mlon={lon}`
- What3Words: `https://w3w.co/{lat},{lon}` (or convert to W3W address via API if desired — P2 future enhancement)

**Alternatives considered**:
- **Mapbox GL**: More features (vector tiles, 3D) but requires API key and has usage-based pricing. Overkill for showing a single event pin.
- **Google Maps JS API**: Well-known but requires API key with billing. Adds startup cost.
- **Static map image**: No interactivity. The spec says "interactive map."

**Dependency justification** (Principle VII): Leaflet — actively maintained, BSD license, ~40KB gzipped, eliminates known complexity of map rendering. Loaded on demand per Principle VI.

---

## R-10: Event Freshness Badges (New / Updated)

**Decision**: Compare event `created_at` and `updated_at` against the user's `last_login_at` timestamp (stored in the users table, updated on each session creation). A "New" badge shows if `created_at > last_login_at`. An "Updated" badge shows if `updated_at > last_login_at AND created_at <= last_login_at`.

**Rationale**: FR-09 requires freshness badges for "New" (created since last login) and "Updated" (modified since last login). This is a simple timestamp comparison — no need for a separate "read" tracking table.

**For unauthenticated users**: No badges shown (no `last_login_at` to compare against).

**Implementation**: The `last_login_at` field is set via a next-auth session callback. The events list API includes `isNew` and `isUpdated` boolean flags in the response when the caller is authenticated.

**Alternatives considered**:
- **Per-event read tracking**: A `user_event_views` junction table recording when each user last viewed each event. Accurate but expensive at scale (N users × M events rows). Overkill for badges.
- **Client-side localStorage**: Store last visit timestamp in browser. Doesn't work across devices. Server-side is more reliable.
- **24-hour window instead of last login**: "New" = created in last 24h. Simpler but doesn't match the spec's "since last login" requirement.
