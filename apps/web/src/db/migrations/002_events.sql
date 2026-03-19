-- Migration: 001_events
-- All 8 tables for Event Discovery & RSVP per Spec 001 data-model

-- 1. Countries reference table
CREATE TABLE IF NOT EXISTS countries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(255) NOT NULL,
    code            varchar(10) NOT NULL UNIQUE,
    continent_code  varchar(10) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Cities
CREATE TABLE IF NOT EXISTS cities (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255) NOT NULL,
    slug        varchar(255) NOT NULL UNIQUE,
    country_id  uuid NOT NULL REFERENCES countries(id),
    latitude    decimal(9,6) NOT NULL,
    longitude   decimal(9,6) NOT NULL,
    timezone    varchar(100) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_country ON cities (country_id);
CREATE INDEX IF NOT EXISTS idx_cities_coords ON cities (latitude, longitude);

-- 3. Venues
CREATE TABLE IF NOT EXISTS venues (
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

CREATE INDEX IF NOT EXISTS idx_venues_city ON venues (city_id);
CREATE INDEX IF NOT EXISTS idx_venues_created_by ON venues (created_by);

-- 4. Events
CREATE TABLE IF NOT EXISTS events (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 varchar(255) NOT NULL,
    description           text,
    start_datetime        timestamptz NOT NULL,
    end_datetime          timestamptz NOT NULL,
    venue_id              uuid NOT NULL REFERENCES venues(id),
    category              varchar(50) NOT NULL
                          CHECK (category IN ('jam','workshop','class','festival','social','retreat','teacher_training')),
    skill_level           varchar(50) NOT NULL
                          CHECK (skill_level IN ('beginner','intermediate','advanced','all_levels')),
    prerequisites         text,
    cost                  decimal(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
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
                          CHECK (status IN ('published','cancelled','draft')),
    cancelled_at          timestamptz,
    created_by            uuid NOT NULL REFERENCES users(id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT events_end_after_start CHECK (end_datetime > start_datetime),
    CONSTRAINT events_external_url CHECK (NOT is_external OR external_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_events_start ON events (start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events (venue_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_skill ON events (skill_level);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events (created_by);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status) WHERE status = 'published';

-- 5. RSVPs
CREATE TABLE IF NOT EXISTS rsvps (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          uuid NOT NULL REFERENCES events(id),
    user_id           uuid NOT NULL REFERENCES users(id),
    occurrence_date   date,
    role              varchar(20) NOT NULL CHECK (role IN ('base','flyer','hybrid')),
    name_visible      boolean NOT NULL DEFAULT true,
    status            varchar(20) NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed','cancelled','pending_payment')),
    stripe_charge_id  varchar(255),
    cancelled_at      timestamptz,
    cancellation_type varchar(20) CHECK (cancellation_type IN ('credit','refund','no_refund','event_cancelled')),
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_unique ON rsvps (event_id, user_id, occurrence_date) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_rsvps_event_active ON rsvps (event_id) WHERE status IN ('confirmed', 'pending_payment');
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON rsvps (user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_event_role ON rsvps (event_id, role) WHERE status = 'confirmed';

-- 6. Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events(id),
    user_id         uuid NOT NULL REFERENCES users(id),
    occurrence_date date,
    role            varchar(20) NOT NULL CHECK (role IN ('base','flyer','hybrid')),
    position        integer NOT NULL,
    joined_at       timestamptz NOT NULL DEFAULT now(),
    promoted_at     timestamptz,
    expired_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique ON waitlist (event_id, user_id, occurrence_date) WHERE promoted_at IS NULL AND expired_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_event_position ON waitlist (event_id, position) WHERE promoted_at IS NULL AND expired_at IS NULL;

-- 7. Event Interests
CREATE TABLE IF NOT EXISTS event_interests (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    uuid NOT NULL REFERENCES events(id),
    user_id     uuid NOT NULL REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_interest_user ON event_interests (user_id);

-- 8. Credits
CREATE TABLE IF NOT EXISTS credits (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(id),
    creator_id           uuid NOT NULL REFERENCES users(id),
    amount               decimal(10,2) NOT NULL CHECK (amount > 0),
    currency             varchar(3) NOT NULL,
    remaining_balance    decimal(10,2) NOT NULL CHECK (remaining_balance >= 0 AND remaining_balance <= amount),
    issued_from_event_id uuid NOT NULL REFERENCES events(id),
    issued_from_rsvp_id  uuid NOT NULL REFERENCES rsvps(id),
    created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_user_creator ON credits (user_id, creator_id) WHERE remaining_balance > 0;
CREATE INDEX IF NOT EXISTS idx_credits_user ON credits (user_id);
