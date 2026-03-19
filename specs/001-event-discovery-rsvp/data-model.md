# Data Model: Event Discovery & RSVP

**Spec**: 001 | **Date**: 2026-03-15

---

## Entity Relationship Overview

```
┌──────────┐       ┌──────────────┐       ┌───────────┐
│  events  │──N:1──│    venues     │──N:1──│   cities   │
└──────────┘       └──────────────┘       └───────────┘
     │                                          │
     │──1:N──┌──────────┐                      N:1
     │       │  rsvps   │               ┌────────────┐
     │       └──────────┘               │ countries  │
     │                                  └────────────┘
     │──1:N──┌──────────────┐
     │       │  waitlist    │
     │       └──────────────┘
     │
     │──1:N──┌──────────────────┐
     │       │ event_interests  │
     │       └──────────────────┘
     │
     └──N:1──┌──────────┐       ┌──────────────────────┐
             │  users   │──1:N──│       credits         │
             │(from 004)│       └──────────────────────┘
             └──────────┘
                  │
                  └──N:1── geography (from 004), permission_grants (from 004)
```

**Dependency on Spec 004**: This model references `users`, `geography`, and `permission_grants` tables defined in Spec 004's data model. The `cities` and `countries` tables defined here extend the geography hierarchy from 004 with geolocation fields needed for Spec 001.

---

## Entities

### 1. countries

Country reference table. Referenced by cities.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | varchar(255) | NOT NULL | Display name (e.g., "United Kingdom") |
| code | varchar(10) | NOT NULL, UNIQUE | ISO 3166-1 alpha-2 (e.g., "GB") |
| continent_code | varchar(10) | NOT NULL | (e.g., "EU") — links to geography.continent |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_countries_code` on `(code)`

**Note**: `continent_code` maps to the `geography.continent` values from Spec 004. This is a lightweight link — no FK constraint to geography to keep the tables independent.

---

### 2. cities

Platform city registry with geolocation. Events and venues reference cities. Geolocation snap (FR-04) queries this table.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | varchar(255) | NOT NULL | Display name (e.g., "Bristol") |
| slug | varchar(255) | NOT NULL, UNIQUE | URL-safe key (e.g., "bristol") — matches geography.city from 004 |
| country_id | uuid | NOT NULL, FK → countries(id) | |
| latitude | decimal(9,6) | NOT NULL | City center latitude |
| longitude | decimal(9,6) | NOT NULL | City center longitude |
| timezone | varchar(100) | NOT NULL | IANA timezone (e.g., "Europe/London") |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_cities_slug` on `(slug)`
- `idx_cities_country` on `(country_id)`
- `idx_cities_coords` on `(latitude, longitude)` — for geolocation snap query

**Validation rules**:
- `slug` must be lowercase, alphanumeric with hyphens
- `latitude` in range [-90, 90]
- `longitude` in range [-180, 180]
- `timezone` must be a valid IANA timezone identifier

**Relationship to Spec 004's geography**: The `slug` value matches `geography.city`. When a city is created here, a corresponding row should exist in `geography` for permission scope resolution. The seed script populates both tables.

---

### 3. venues

Physical locations where events take place. Created by Event Creators within their scope.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | varchar(255) | NOT NULL | |
| address | text | NOT NULL | Full address string |
| city_id | uuid | NOT NULL, FK → cities(id) | |
| latitude | decimal(9,6) | NOT NULL | Venue-specific coordinates |
| longitude | decimal(9,6) | NOT NULL | |
| created_by | uuid | NOT NULL, FK → users(id) | Resource ownership (Principle XI) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_venues_city` on `(city_id)`
- `idx_venues_created_by` on `(created_by)`

**Validation rules**:
- `name` max 255 characters
- `address` max 1000 characters
- `latitude` / `longitude` in valid ranges
- `created_by` must have Event Creator (or higher) permission scoped to the venue's city (enforced by `withPermission('createVenue', ...)`)

---

### 4. events

Core event entity. Created by Event Creators. Supports free and paid events.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| title | varchar(255) | NOT NULL | |
| description | text | NULL | |
| start_datetime | timestamptz | NOT NULL | Event start (with timezone) |
| end_datetime | timestamptz | NOT NULL | Event end |
| venue_id | uuid | NOT NULL, FK → venues(id) | |
| category | varchar(50) | NOT NULL, CHECK (see below) | Enum: jam, workshop, class, festival, social, retreat, teacher_training |
| skill_level | varchar(50) | NOT NULL, CHECK (see below) | Enum: beginner, intermediate, advanced, all_levels |
| prerequisites | text | NULL | Free text — attendee confirms via checkbox |
| cost | decimal(10,2) | NOT NULL, DEFAULT 0 | 0 = free event |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | ISO 4217 code |
| concession_cost | decimal(10,2) | NULL | Reduced price (optional) |
| capacity | integer | NOT NULL | Hard limit; creators set a high value for "unlimited" |
| refund_window_hours | integer | NOT NULL, DEFAULT 24 | Hours before start; 0 = no refund |
| waitlist_cutoff_hours | integer | NOT NULL, DEFAULT 2 | Hours before start; waitlist auto-promotion stops |
| is_external | boolean | NOT NULL, DEFAULT false | External link event (not managed on platform) |
| external_url | varchar(2048) | NULL | Required when is_external = true |
| poster_image_url | varchar(2048) | NULL | |
| recurrence_rule | text | NULL | RFC 5545 RRULE string — populated by Spec 003 |
| status | varchar(20) | NOT NULL, DEFAULT 'published' | published, cancelled, draft |
| cancelled_at | timestamptz | NULL | Set when creator cancels event |
| created_by | uuid | NOT NULL, FK → users(id) | Resource ownership (Principle XI) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Check constraints**:
```sql
CHECK (category IN ('jam', 'workshop', 'class', 'festival', 'social', 'retreat', 'teacher_training'))
CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'all_levels'))
CHECK (status IN ('published', 'cancelled', 'draft'))
CHECK (cost >= 0)
CHECK (capacity > 0)
CHECK (refund_window_hours >= 0)
CHECK (waitlist_cutoff_hours >= 0)
CHECK (end_datetime > start_datetime)
CHECK (NOT is_external OR external_url IS NOT NULL)
```

**Indexes**:
- `idx_events_start` on `(start_datetime)` — primary sort for listings
- `idx_events_venue` on `(venue_id)`
- `idx_events_category` on `(category)`
- `idx_events_skill` on `(skill_level)`
- `idx_events_created_by` on `(created_by)`
- `idx_events_status` on `(status) WHERE status = 'published'` — most queries filter to published
- `idx_events_city` — composite via JOIN venue → city; or denormalize `city_id` on event for query performance (see note)

**Denormalization note**: For the events list query, filtering by city requires `JOIN venues ON events.venue_id = venues.id WHERE venues.city_id = $cityId`. This join is cheap with indexed FKs. If query performance becomes an issue, a denormalized `city_id` column on events (updated via trigger) can be added. Deferring per Principle VII.

**Extension points**:
- `recurrence_rule`: Populated by Spec 003 (Recurring/Multi-Day). NULL for single events.
- Teacher assignment: Spec 005 adds an `event_teachers` junction table — no FK on events.

---

### 5. rsvps

RSVP records linking users to events, with AcroYoga role selection.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| event_id | uuid | NOT NULL, FK → events(id) | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| occurrence_date | date | NULL | For recurring events (Spec 003); NULL for single events |
| role | varchar(20) | NOT NULL, CHECK (role IN ('base', 'flyer', 'hybrid')) | AcroYoga role |
| name_visible | boolean | NOT NULL, DEFAULT true | Opt-in to public attendee list (Principle III) |
| status | varchar(20) | NOT NULL, DEFAULT 'confirmed' | confirmed, cancelled, pending_payment |
| stripe_charge_id | varchar(255) | NULL | Stripe charge ID for paid events |
| cancelled_at | timestamptz | NULL | |
| cancellation_type | varchar(20) | NULL | credit, refund, no_refund, event_cancelled |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_rsvps_unique` on `(event_id, user_id, occurrence_date) WHERE status != 'cancelled'` — one active RSVP per user per occurrence
- `idx_rsvps_event_active` on `(event_id) WHERE status = 'confirmed'` — count/list active RSVPs
- `idx_rsvps_user` on `(user_id)` — "my RSVPs" query
- `idx_rsvps_event_role` on `(event_id, role) WHERE status = 'confirmed'` — role balance counts

**Validation rules**:
- One active RSVP per `(event_id, user_id, occurrence_date)` — enforced by unique index
- `occurrence_date` is NULL for non-recurring events; set for recurring (Spec 003)
- `status = 'pending_payment'` used for waitlist promotions on paid events
- `stripe_charge_id` required when `status = 'confirmed'` AND `event.cost > 0`

**State transitions**:
```
(none) → confirmed          (free event RSVP)
(none) → confirmed          (paid event after Stripe charge)
(none) → pending_payment    (waitlist promotion for paid event)
pending_payment → confirmed (payment completed within timeout)
pending_payment → cancelled (payment timeout — spot released to next waitlisted)
confirmed → cancelled       (user cancellation or event cancellation)
```

---

### 6. waitlist

Ordered waitlist entries for full events.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| event_id | uuid | NOT NULL, FK → events(id) | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| occurrence_date | date | NULL | For recurring events (Spec 003) |
| role | varchar(20) | NOT NULL, CHECK (role IN ('base', 'flyer', 'hybrid')) | |
| position | integer | NOT NULL | 1-based queue position |
| joined_at | timestamptz | NOT NULL, DEFAULT now() | |
| promoted_at | timestamptz | NULL | Set when auto-promoted to RSVP |
| expired_at | timestamptz | NULL | Set if promotion was offered but payment timed out |

**Indexes**:
- `UNIQUE idx_waitlist_unique` on `(event_id, user_id, occurrence_date) WHERE promoted_at IS NULL AND expired_at IS NULL` — one active waitlist entry per user per occurrence
- `idx_waitlist_event_position` on `(event_id, position) WHERE promoted_at IS NULL AND expired_at IS NULL` — ordered promotion queue

**Validation rules**:
- `position` is auto-assigned as `MAX(position) + 1` for the event/occurrence on INSERT
- User cannot be on waitlist if they have an active RSVP (application logic, not DB constraint)

---

### 7. event_interests

"Interested" / watchlist entries (FR-08).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| event_id | uuid | NOT NULL, FK → events(id) | |
| user_id | uuid | NOT NULL, FK → users(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_interest_unique` on `(event_id, user_id)`
- `idx_interest_user` on `(user_id)` — "my interests" query

**Note**: Interest is retained even if the user later RSVPs (Edge Case in spec).

---

### 8. credits

Creator-scoped credits for cancellation refund alternative (FR-18, FR-19).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → users(id) | Credit holder |
| creator_id | uuid | NOT NULL, FK → users(id) | Credit scoped to this creator |
| amount | decimal(10,2) | NOT NULL | Original credit amount |
| currency | varchar(3) | NOT NULL | ISO 4217 code |
| remaining_balance | decimal(10,2) | NOT NULL | Decrements as credit is used |
| issued_from_event_id | uuid | NOT NULL, FK → events(id) | Event that triggered the credit |
| issued_from_rsvp_id | uuid | NOT NULL, FK → rsvps(id) | RSVP that was cancelled |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_credits_user_creator` on `(user_id, creator_id) WHERE remaining_balance > 0` — checkout query: available credits for a creator
- `idx_credits_user` on `(user_id)` — "my credits" list

**Validation rules**:
- `remaining_balance` in range [0, amount] — cannot go negative
- `currency` must match the original event's currency
- No expiry (spec: "no expiry")
- Credits consumed FIFO (oldest first) — application logic in checkout service

**Check constraints**:
```sql
CHECK (amount > 0)
CHECK (remaining_balance >= 0)
CHECK (remaining_balance <= amount)
```

---

## Migration SQL

```sql
-- Migration: 001_events
-- Depends on: users table (from auth setup), geography table (from 004_permissions)

-- 1. Countries
CREATE TABLE countries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(255) NOT NULL,
    code            varchar(10) NOT NULL UNIQUE,
    continent_code  varchar(10) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Cities
CREATE TABLE cities (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255) NOT NULL,
    slug        varchar(255) NOT NULL UNIQUE,
    country_id  uuid NOT NULL REFERENCES countries(id),
    latitude    decimal(9,6) NOT NULL,
    longitude   decimal(9,6) NOT NULL,
    timezone    varchar(100) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cities_country ON cities (country_id);
CREATE INDEX idx_cities_coords ON cities (latitude, longitude);

-- 3. Venues
CREATE TABLE venues (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255) NOT NULL,
    address     text NOT NULL,
    city_id     uuid NOT NULL REFERENCES cities(id),
    latitude    decimal(9,6) NOT NULL,
    longitude   decimal(9,6) NOT NULL,
    created_by  uuid NOT NULL REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_city ON venues (city_id);
CREATE INDEX idx_venues_created_by ON venues (created_by);

-- 4. Events
CREATE TABLE events (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 varchar(255) NOT NULL,
    description           text,
    start_datetime        timestamptz NOT NULL,
    end_datetime          timestamptz NOT NULL,
    venue_id              uuid NOT NULL REFERENCES venues(id),
    category              varchar(50) NOT NULL
                          CHECK (category IN ('jam', 'workshop', 'class', 'festival',
                                              'social', 'retreat', 'teacher_training')),
    skill_level           varchar(50) NOT NULL
                          CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
    prerequisites         text,
    cost                  decimal(10,2) NOT NULL DEFAULT 0,
    currency              varchar(3) NOT NULL DEFAULT 'GBP',
    concession_cost       decimal(10,2),
    capacity              integer NOT NULL CHECK (capacity > 0),
    refund_window_hours   integer NOT NULL DEFAULT 24 CHECK (refund_window_hours >= 0),
    waitlist_cutoff_hours integer NOT NULL DEFAULT 2 CHECK (waitlist_cutoff_hours >= 0),
    is_external           boolean NOT NULL DEFAULT false,
    external_url          varchar(2048),
    poster_image_url      varchar(2048),
    recurrence_rule       text,
    status                varchar(20) NOT NULL DEFAULT 'published'
                          CHECK (status IN ('published', 'cancelled', 'draft')),
    cancelled_at          timestamptz,
    created_by            uuid NOT NULL REFERENCES users(id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CHECK (end_datetime > start_datetime),
    CHECK (NOT is_external OR external_url IS NOT NULL)
);

CREATE INDEX idx_events_start ON events (start_datetime);
CREATE INDEX idx_events_venue ON events (venue_id);
CREATE INDEX idx_events_category ON events (category);
CREATE INDEX idx_events_skill ON events (skill_level);
CREATE INDEX idx_events_created_by ON events (created_by);
CREATE INDEX idx_events_status ON events (status) WHERE status = 'published';

-- 5. RSVPs
CREATE TABLE rsvps (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          uuid NOT NULL REFERENCES events(id),
    user_id           uuid NOT NULL REFERENCES users(id),
    occurrence_date   date,
    role              varchar(20) NOT NULL CHECK (role IN ('base', 'flyer', 'hybrid')),
    name_visible      boolean NOT NULL DEFAULT true,
    status            varchar(20) NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed', 'cancelled', 'pending_payment')),
    stripe_charge_id  varchar(255),
    cancelled_at      timestamptz,
    cancellation_type varchar(20) CHECK (cancellation_type IN ('credit', 'refund', 'no_refund', 'event_cancelled')),
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_rsvps_unique ON rsvps (event_id, user_id, occurrence_date)
    WHERE status != 'cancelled';
CREATE INDEX idx_rsvps_event_active ON rsvps (event_id) WHERE status = 'confirmed';
CREATE INDEX idx_rsvps_user ON rsvps (user_id);
CREATE INDEX idx_rsvps_event_role ON rsvps (event_id, role) WHERE status = 'confirmed';

-- 6. Waitlist
CREATE TABLE waitlist (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         uuid NOT NULL REFERENCES events(id),
    user_id          uuid NOT NULL REFERENCES users(id),
    occurrence_date  date,
    role             varchar(20) NOT NULL CHECK (role IN ('base', 'flyer', 'hybrid')),
    position         integer NOT NULL,
    joined_at        timestamptz NOT NULL DEFAULT now(),
    promoted_at      timestamptz,
    expired_at       timestamptz
);

CREATE UNIQUE INDEX idx_waitlist_unique ON waitlist (event_id, user_id, occurrence_date)
    WHERE promoted_at IS NULL AND expired_at IS NULL;
CREATE INDEX idx_waitlist_event_position ON waitlist (event_id, position)
    WHERE promoted_at IS NULL AND expired_at IS NULL;

-- 7. Event interests
CREATE TABLE event_interests (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   uuid NOT NULL REFERENCES events(id),
    user_id    uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_interest_user ON event_interests (user_id);

-- 8. Credits
CREATE TABLE credits (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid NOT NULL REFERENCES users(id),
    creator_id            uuid NOT NULL REFERENCES users(id),
    amount                decimal(10,2) NOT NULL CHECK (amount > 0),
    currency              varchar(3) NOT NULL,
    remaining_balance     decimal(10,2) NOT NULL CHECK (remaining_balance >= 0),
    issued_from_event_id  uuid NOT NULL REFERENCES events(id),
    issued_from_rsvp_id   uuid NOT NULL REFERENCES rsvps(id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    CHECK (remaining_balance <= amount)
);

CREATE INDEX idx_credits_user_creator ON credits (user_id, creator_id)
    WHERE remaining_balance > 0;
CREATE INDEX idx_credits_user ON credits (user_id);
```

---

## Shared Entity Notes

### City ↔ Geography Sync

Spec 004 defines a `geography` table with `(city, country, continent)` for scope resolution. Spec 001 defines `cities` and `countries` tables with geolocation fields. These are complementary:

- `cities.slug` matches `geography.city`
- `countries.code` maps to `geography.country` (with a conventional mapping)
- The seed script populates both tables from the same source dataset
- Permission scope resolution uses `geography`; event queries use `cities`/`countries`

This avoids altering Spec 004's schema while providing the geolocation fields Spec 001 needs.

### Event ↔ Recurrence (Spec 003 extension)

The `recurrence_rule` column on `events` is NULL for non-recurring events. Spec 003 will:
1. Populate `recurrence_rule` with RFC 5545 RRULE strings on event creation
2. Add an `event_occurrence_overrides` table for single-occurrence edits/cancellations
3. The RSVP and waitlist tables already support `occurrence_date` — no schema change needed

### Event ↔ Teacher (Spec 005 extension)

Spec 005 will add an `event_teachers` junction table:
```sql
CREATE TABLE event_teachers (
    event_id   uuid NOT NULL REFERENCES events(id),
    teacher_id uuid NOT NULL REFERENCES users(id),
    PRIMARY KEY (event_id, teacher_id)
);
```
No column changes to the events table.
