-- Migration: 005_recurring_multiday
-- 7 tables for Recurring & Multi-Day Events per Spec 003

-- 1. Occurrence Overrides (single-occurrence edits/cancellations)
CREATE TABLE IF NOT EXISTS occurrence_overrides (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events(id),
    occurrence_date date NOT NULL,
    override_type   varchar(20) NOT NULL CHECK (override_type IN ('cancelled','modified')),
    modified_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by      uuid NOT NULL REFERENCES users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_occurrence_overrides_event ON occurrence_overrides (event_id);

-- 2. Event Groups (festivals, combos, series)
CREATE TABLE IF NOT EXISTS event_groups (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255) NOT NULL,
    type        varchar(20) NOT NULL CHECK (type IN ('festival','combo','series')),
    description text,
    start_date  date NOT NULL,
    end_date    date NOT NULL,
    currency    varchar(3) NOT NULL DEFAULT 'GBP',
    poster_image_url varchar(2048),
    created_by  uuid NOT NULL REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT event_groups_end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_event_groups_type ON event_groups (type);
CREATE INDEX IF NOT EXISTS idx_event_groups_created_by ON event_groups (created_by);

-- 3. Event Group Members (linking events to groups)
CREATE TABLE IF NOT EXISTS event_group_members (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   uuid NOT NULL REFERENCES event_groups(id) ON DELETE CASCADE,
    event_id   uuid NOT NULL REFERENCES events(id),
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (group_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_group_members_group ON event_group_members (group_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_group_members_event ON event_group_members (event_id);

-- 4. Ticket Types (per event group)
CREATE TABLE IF NOT EXISTS ticket_types (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id         uuid NOT NULL REFERENCES event_groups(id) ON DELETE CASCADE,
    name             varchar(255) NOT NULL,
    description      text,
    cost             decimal(10,2) NOT NULL CHECK (cost >= 0),
    concession_cost  decimal(10,2) CHECK (concession_cost IS NULL OR concession_cost >= 0),
    capacity         integer NOT NULL CHECK (capacity > 0),
    covers_all_events boolean NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ticket_concession_le_cost CHECK (concession_cost IS NULL OR concession_cost <= cost)
);

CREATE INDEX IF NOT EXISTS idx_ticket_types_group ON ticket_types (group_id);

-- 5. Ticket Type Events (junction: which events a ticket covers when covers_all_events = false)
CREATE TABLE IF NOT EXISTS ticket_type_events (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    event_id       uuid NOT NULL REFERENCES events(id),
    UNIQUE (ticket_type_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_type_events_ticket ON ticket_type_events (ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_ticket_type_events_event ON ticket_type_events (event_id);

-- 6. Bookings (group ticket purchases)
CREATE TABLE IF NOT EXISTS bookings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id  uuid NOT NULL REFERENCES ticket_types(id),
    user_id         uuid NOT NULL REFERENCES users(id),
    pricing_tier    varchar(20) NOT NULL DEFAULT 'standard'
                    CHECK (pricing_tier IN ('standard','concession')),
    amount_paid     decimal(10,2) NOT NULL CHECK (amount_paid >= 0),
    currency        varchar(3) NOT NULL,
    credits_applied decimal(10,2) NOT NULL DEFAULT 0 CHECK (credits_applied >= 0),
    payment_status  varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (payment_status IN ('pending','completed','cancelled','refunded')),
    stripe_charge_id varchar(255),
    cancelled_at    timestamptz,
    cancellation_type varchar(20) CHECK (cancellation_type IN ('credit','refund','no_refund','event_cancelled')),
    booked_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ticket_type ON bookings (ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (payment_status) WHERE payment_status IN ('pending','completed');

-- 7. Concession Statuses
CREATE TABLE IF NOT EXISTS concession_statuses (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id),
    status      varchar(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','revoked')),
    evidence    text,
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    rejected_by uuid REFERENCES users(id),
    rejected_at timestamptz,
    revoked_by  uuid REFERENCES users(id),
    revoked_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concession_user ON concession_statuses (user_id);
-- Partial unique index: only one active/pending per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_concession_active ON concession_statuses (user_id) WHERE status IN ('pending','approved');
