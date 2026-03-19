# Data Model: Recurring & Multi-Day Events

**Spec**: 003 | **Date**: 2026-03-15

---

## Entity Relationship Overview

```
┌──────────┐                          ┌───────────────────────┐
│  events  │──1:N──────────────────── │  occurrence_overrides │
│(from 001)│                          └───────────────────────┘
│          │
│          │──N:1──┌──────────────────────┐
│          │       │  event_group_members  │
│          │       └──────────────────────┘
└──────────┘              │
                          N:1
                    ┌──────────────┐       ┌──────────────┐
                    │ event_groups  │──1:N──│ ticket_types  │
                    └──────────────┘       └──────────────┘
                          │                       │
                          N:1                     1:N
                    ┌──────────┐           ┌──────────────┐
                    │  users   │           │   bookings   │──N:1── users
                    │(from 004)│           └──────────────┘
                    └──────────┘

┌──────────┐
│  users   │──1:1──┌─────────────────────┐
│(from 004)│       │  concession_statuses │
│          │       └─────────────────────┘
└──────────┘
```

**Dependencies**:
- **Spec 001**: Extends `events` (uses `recurrence_rule` column). RSVPs and waitlist already have `occurrence_date`.
- **Spec 004**: `users`, `permission_grants` (for scope validation and concession admin approval).

---

## Entities

### 1. occurrence_overrides

Per-occurrence modifications or cancellations for recurring events. Keyed by the composite `(event_id, occurrence_date)`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| event_id | uuid | NOT NULL, FK → events(id) ON DELETE CASCADE | Parent recurring event |
| occurrence_date | date | NOT NULL | The specific occurrence being overridden |
| override_type | varchar(20) | NOT NULL, CHECK (override_type IN ('cancelled', 'modified')) | |
| modified_fields | jsonb | NULL | Partial patch of event fields; NULL when type = 'cancelled' |
| cancel_reason | text | NULL | Optional reason for cancellation |
| created_by | uuid | NOT NULL, FK → users(id) | Event creator who made the override |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_overrides_event_date` on `(event_id, occurrence_date)` — one override per occurrence
- `idx_overrides_event` on `(event_id)` — fetch all overrides for a series

**Check constraints**:
```sql
CHECK (
  (override_type = 'cancelled' AND modified_fields IS NULL)
  OR (override_type = 'modified' AND modified_fields IS NOT NULL)
)
```

**Validation rules**:
- `occurrence_date` must be a valid date that the event's RRULE would generate
- `modified_fields` schema validated by Zod at API boundary:
  ```typescript
  const ModifiedFieldsSchema = z.object({
    venue_id: z.string().uuid().optional(),
    start_datetime: z.string().datetime().optional(),
    end_datetime: z.string().datetime().optional(),
    capacity: z.number().int().positive().optional(),
    description: z.string().optional(),
  }).refine(obj => Object.keys(obj).length > 0, 'At least one field required');
  ```
- Price changes per-occurrence are NOT supported (price is series-wide)
- `created_by` must match `events.created_by` (or be a scoped admin)

**Cascade behaviour**: When the parent event is deleted, all overrides are cascade-deleted.

**Notification trigger**: When `override_type = 'cancelled'`, all users with active RSVPs for `(event_id, occurrence_date)` receive cancellation notifications (async, outside transaction).

---

### 2. event_groups

Groups of events — festivals, combo deals, or organisational series.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | varchar(255) | NOT NULL | Display name (e.g., "Bristol AcroFest 2026") |
| slug | varchar(255) | NOT NULL, UNIQUE | URL-safe key |
| type | varchar(20) | NOT NULL, CHECK (type IN ('festival', 'combo', 'series')) | |
| description | text | NULL | |
| start_date | date | NOT NULL | Group's overall start date |
| end_date | date | NOT NULL | Group's overall end date |
| currency | varchar(3) | NOT NULL | ISO 4217; all ticket types inherit this |
| poster_image_url | varchar(2048) | NULL | |
| created_by | uuid | NOT NULL, FK → users(id) | Resource ownership (Principle XI) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_groups_slug` on `(slug)`
- `idx_groups_type` on `(type)`
- `idx_groups_date_range` on `(start_date, end_date)` — for listing active/upcoming groups
- `idx_groups_created_by` on `(created_by)`

**Check constraints**:
```sql
CHECK (end_date >= start_date)
CHECK (currency ~ '^[A-Z]{3}$')  -- ISO 4217 format
```

**Validation rules**:
- `slug` must be lowercase, alphanumeric with hyphens
- `currency` must be a valid ISO 4217 code (validated by Zod)
- `created_by` must have Event Creator (or higher) permission scoped to cover all member events' cities
- `type = 'festival'` implies contiguous date range; `type = 'combo'` allows non-contiguous; `type = 'series'` is purely organisational (no ticketing)

---

### 3. event_group_members

Junction table linking events to groups, with ordering.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| group_id | uuid | NOT NULL, FK → event_groups(id) ON DELETE CASCADE | |
| event_id | uuid | NOT NULL, FK → events(id) ON DELETE CASCADE | |
| sort_order | integer | NOT NULL, DEFAULT 0 | Display ordering within group |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_group_members_unique` on `(group_id, event_id)` — each event appears once per group
- `idx_group_members_event` on `(event_id)` — find which groups an event belongs to
- `idx_group_members_group_order` on `(group_id, sort_order)` — ordered listing

**Validation rules**:
- All member events must have the same `created_by` as the event group (Principle XI — resource ownership)
- All member events must have the same `currency` as the event group (FR-12)
- For `type = 'festival'`: member events' dates should fall within group's `start_date`–`end_date` range (warning, not hard constraint)
- An event can belong to at most one group of type `festival` or `combo` (but can be in multiple `series` groups)

---

### 4. ticket_types

Ticket types for event groups — per-day tickets, combined passes, etc.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| group_id | uuid | NOT NULL, FK → event_groups(id) ON DELETE CASCADE | |
| name | varchar(255) | NOT NULL | e.g., "Friday Only", "Full Weekend Pass" |
| description | text | NULL | |
| cost | decimal(10,2) | NOT NULL | Standard price |
| concession_cost | decimal(10,2) | NULL | Reduced price; NULL = no concession option (FR-07) |
| capacity | integer | NULL | NULL = unlimited (inherits from member event capacities) |
| covers_all_events | boolean | NOT NULL, DEFAULT false | True for "full pass" tickets |
| sort_order | integer | NOT NULL, DEFAULT 0 | Display ordering |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_ticket_types_group` on `(group_id, sort_order)` — ordered listing per group

**Check constraints**:
```sql
CHECK (cost >= 0)
CHECK (concession_cost IS NULL OR concession_cost >= 0)
CHECK (concession_cost IS NULL OR concession_cost <= cost)
CHECK (capacity IS NULL OR capacity > 0)
```

**Validation rules**:
- Currency is inherited from the parent `event_group.currency` (not stored on ticket type)
- Ticket types only valid for `festival` and `combo` groups; `series` groups have no ticketing
- `covers_all_events = true` means this ticket covers every member event in the group
- Concession pricing only available when ticket type has non-null `concession_cost` AND user has approved concession status

---

### 5. ticket_type_events

Junction table mapping which member events each ticket type covers. Required for per-day tickets; ignored when `ticket_types.covers_all_events = true`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| ticket_type_id | uuid | NOT NULL, FK → ticket_types(id) ON DELETE CASCADE | |
| event_id | uuid | NOT NULL, FK → events(id) ON DELETE CASCADE | |

**Indexes**:
- `UNIQUE idx_tte_unique` on `(ticket_type_id, event_id)` — no duplicates
- `idx_tte_ticket` on `(ticket_type_id)` — find events for a ticket type
- `idx_tte_event` on `(event_id)` — find ticket types covering an event

**Validation rules**:
- `event_id` must be a member of the same event group as the ticket type
- Not used when `ticket_types.covers_all_events = true` (all member events are implicitly covered)

---

### 6. bookings

Individual ticket purchases for group tickets.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| ticket_type_id | uuid | NOT NULL, FK → ticket_types(id) | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| pricing_tier | varchar(20) | NOT NULL, CHECK (pricing_tier IN ('standard', 'concession')) | |
| amount_paid | decimal(10,2) | NOT NULL | Actual amount charged (after credits) |
| currency | varchar(3) | NOT NULL | ISO 4217 |
| credits_applied | decimal(10,2) | NOT NULL, DEFAULT 0 | Credits consumed |
| stripe_charge_id | varchar(255) | NULL | NULL if fully covered by credits |
| status | varchar(20) | NOT NULL, DEFAULT 'confirmed' | confirmed, cancelled, pending_payment |
| cancelled_at | timestamptz | NULL | |
| cancellation_type | varchar(20) | NULL | credit, refund, no_refund |
| booked_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_bookings_unique` on `(ticket_type_id, user_id) WHERE status != 'cancelled'` — one active booking per ticket type per user
- `idx_bookings_user` on `(user_id)` — "my bookings" query
- `idx_bookings_ticket_active` on `(ticket_type_id) WHERE status = 'confirmed'` — count sold tickets

**Check constraints**:
```sql
CHECK (amount_paid >= 0)
CHECK (credits_applied >= 0)
CHECK (status IN ('confirmed', 'cancelled', 'pending_payment'))
```

**State transitions**:
```
(none) → confirmed        (successful payment or free ticket)
(none) → pending_payment  (awaiting Stripe charge)
pending_payment → confirmed  (payment completed)
pending_payment → cancelled  (payment timeout)
confirmed → cancelled     (user cancellation)
```

**Relationships**:
- The ticket type determines which events the booking covers (via `ticket_type_events` or `covers_all_events`)
- Cancellation follows Spec 001's refund policy (refund window, credit preferred, atomic pass cancellation)

---

### 7. concession_statuses

User-level concession status, approved by scoped admins.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| status | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')) | |
| evidence_notes | text | NULL | User's description of concession eligibility |
| approved_by | uuid | NULL, FK → users(id) | Admin who approved |
| approved_at | timestamptz | NULL | |
| rejected_by | uuid | NULL, FK → users(id) | Admin who rejected |
| rejected_at | timestamptz | NULL | |
| revoked_by | uuid | NULL, FK → users(id) | Admin who revoked |
| revoked_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_concession_user_active` on `(user_id) WHERE status IN ('pending', 'approved')` — one active/pending status per user
- `idx_concession_status` on `(status)` — admin panel filtering

**Validation rules**:
- Only one `pending` or `approved` status per user at a time (enforced by unique partial index)
- Users with `rejected` or `revoked` status can reapply (creates a new row)
- Approval requires the admin to have scope covering the user's home city (or higher)

**State transitions**:
```
(none) → pending       (user applies)
pending → approved     (admin approves; sets approved_by, approved_at)
pending → rejected     (admin rejects; sets rejected_by, rejected_at)
approved → revoked     (admin revokes; sets revoked_by, revoked_at)
rejected → (user creates new row with status = pending)
revoked → (user creates new row with status = pending)
```

**Checkout integration**: At checkout, query:
```sql
SELECT id FROM concession_statuses
WHERE user_id = $userId AND status = 'approved'
LIMIT 1;
```
If row exists → user eligible for concession pricing.

---

## Spec 001 Entity Extensions

### events (existing — extended by 003)

The following column was already defined in Spec 001 as an extension point:

| Column | Type | Notes |
|--------|------|-------|
| recurrence_rule | text, NULL | RFC 5545 RRULE string. NULL for single events. Populated by Spec 003. |

**003 adds no new columns to events**. The `recurrence_rule` column is the integration point. Occurrence expansion, overrides, and group membership are in separate tables.

### rsvps (existing — used by 003)

The `occurrence_date` column (defined in Spec 001) serves as the composite key suffix for per-occurrence RSVPs:

| Column | Type | Notes |
|--------|------|-------|
| occurrence_date | date, NULL | Set for recurring event occurrences; NULL for single events. Composite key with `event_id`. |

### waitlist (existing — used by 003)

Same pattern — `occurrence_date` column already defined in Spec 001 for per-occurrence waitlisting.

---

## Migration SQL

```sql
-- Migration: 003_recurring_multiday
-- Depends on: 001_events (events table with recurrence_rule column), 004_permissions (users)

-- 1. Occurrence overrides
CREATE TABLE occurrence_overrides (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    occurrence_date date NOT NULL,
    override_type   varchar(20) NOT NULL CHECK (override_type IN ('cancelled', 'modified')),
    modified_fields jsonb,
    cancel_reason   text,
    created_by      uuid NOT NULL REFERENCES users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (override_type = 'cancelled' AND modified_fields IS NULL)
        OR (override_type = 'modified' AND modified_fields IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_overrides_event_date ON occurrence_overrides (event_id, occurrence_date);
CREATE INDEX idx_overrides_event ON occurrence_overrides (event_id);

-- 2. Event groups
CREATE TABLE event_groups (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(255) NOT NULL,
    slug            varchar(255) NOT NULL UNIQUE,
    type            varchar(20) NOT NULL CHECK (type IN ('festival', 'combo', 'series')),
    description     text,
    start_date      date NOT NULL,
    end_date        date NOT NULL,
    currency        varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    poster_image_url varchar(2048),
    created_by      uuid NOT NULL REFERENCES users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_groups_type ON event_groups (type);
CREATE INDEX idx_groups_date_range ON event_groups (start_date, end_date);
CREATE INDEX idx_groups_created_by ON event_groups (created_by);

-- 3. Event group members (junction)
CREATE TABLE event_group_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid NOT NULL REFERENCES event_groups(id) ON DELETE CASCADE,
    event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (group_id, event_id)
);

CREATE INDEX idx_group_members_event ON event_group_members (event_id);
CREATE INDEX idx_group_members_group_order ON event_group_members (group_id, sort_order);

-- 4. Ticket types
CREATE TABLE ticket_types (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id          uuid NOT NULL REFERENCES event_groups(id) ON DELETE CASCADE,
    name              varchar(255) NOT NULL,
    description       text,
    cost              decimal(10,2) NOT NULL CHECK (cost >= 0),
    concession_cost   decimal(10,2) CHECK (concession_cost IS NULL OR concession_cost >= 0),
    capacity          integer CHECK (capacity IS NULL OR capacity > 0),
    covers_all_events boolean NOT NULL DEFAULT false,
    sort_order        integer NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CHECK (concession_cost IS NULL OR concession_cost <= cost)
);

CREATE INDEX idx_ticket_types_group ON ticket_types (group_id, sort_order);

-- 5. Ticket type → event coverage (junction)
CREATE TABLE ticket_type_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id  uuid NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE (ticket_type_id, event_id)
);

CREATE INDEX idx_tte_ticket ON ticket_type_events (ticket_type_id);
CREATE INDEX idx_tte_event ON ticket_type_events (event_id);

-- 6. Bookings
CREATE TABLE bookings (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id    uuid NOT NULL REFERENCES ticket_types(id),
    user_id           uuid NOT NULL REFERENCES users(id),
    pricing_tier      varchar(20) NOT NULL CHECK (pricing_tier IN ('standard', 'concession')),
    amount_paid       decimal(10,2) NOT NULL CHECK (amount_paid >= 0),
    currency          varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    credits_applied   decimal(10,2) NOT NULL DEFAULT 0 CHECK (credits_applied >= 0),
    stripe_charge_id  varchar(255),
    status            varchar(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending_payment')),
    cancelled_at      timestamptz,
    cancellation_type varchar(20) CHECK (cancellation_type IS NULL OR cancellation_type IN ('credit', 'refund', 'no_refund')),
    booked_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_bookings_unique ON bookings (ticket_type_id, user_id) WHERE status != 'cancelled';
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_bookings_ticket_active ON bookings (ticket_type_id) WHERE status = 'confirmed';

-- 7. Concession statuses
CREATE TABLE concession_statuses (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id),
    status          varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
    evidence_notes  text,
    approved_by     uuid REFERENCES users(id),
    approved_at     timestamptz,
    rejected_by     uuid REFERENCES users(id),
    rejected_at     timestamptz,
    revoked_by      uuid REFERENCES users(id),
    revoked_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_concession_user_active ON concession_statuses (user_id) WHERE status IN ('pending', 'approved');
CREATE INDEX idx_concession_status ON concession_statuses (status);
```

---

## Effective Capacity Calculation

For cross-capacity validation (FR-08), the effective attendee count for a member event is:

```sql
-- Effective attendee count for event E within group G
SELECT
  (
    -- Individual RSVPs for this event (from Spec 001)
    SELECT COUNT(*) FROM rsvps
    WHERE event_id = $eventId
      AND occurrence_date IS NOT DISTINCT FROM $occurrenceDate
      AND status = 'confirmed'
  )
  +
  (
    -- Group bookings that cover this event
    SELECT COUNT(*) FROM bookings b
    JOIN ticket_types tt ON b.ticket_type_id = tt.id
    WHERE tt.group_id = $groupId
      AND b.status = 'confirmed'
      AND (
        tt.covers_all_events = true
        OR EXISTS (
          SELECT 1 FROM ticket_type_events tte
          WHERE tte.ticket_type_id = tt.id AND tte.event_id = $eventId
        )
      )
  )
AS effective_count;
```

This query is used during both individual RSVP (Spec 001 — must now account for group bookings) and group ticket booking (Spec 003) to prevent overselling.
