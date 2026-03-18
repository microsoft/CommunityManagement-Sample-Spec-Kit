-- Migration: 006_teachers_reviews
-- 7 tables for Teacher Profiles & Reviews per Spec 005

-- 1. Teacher Profiles
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL UNIQUE REFERENCES users(id),
    bio             text,
    specialties     text[] NOT NULL DEFAULT '{}',
    badge_status    varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (badge_status IN ('pending','verified','expired','revoked')),
    aggregate_rating decimal(3,2),
    review_count    integer NOT NULL DEFAULT 0,
    is_deleted      boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user ON teacher_profiles (user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_badge ON teacher_profiles (badge_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_specialties ON teacher_profiles USING GIN (specialties) WHERE is_deleted = false;

-- 2. Certifications
CREATE TABLE IF NOT EXISTS certifications (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id    uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    name                  varchar(255) NOT NULL,
    issuing_body          varchar(255) NOT NULL,
    expiry_date           date,
    proof_document_url    varchar(2048),
    status                varchar(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','verified','expired','revoked')),
    verified_by_admin_id  uuid REFERENCES users(id),
    verified_at           timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certifications_teacher ON certifications (teacher_profile_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON certifications (expiry_date) WHERE status = 'verified';

-- 3. Teacher Photos
CREATE TABLE IF NOT EXISTS teacher_photos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id  uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    url                 varchar(2048) NOT NULL,
    sort_order          integer NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_photos_teacher ON teacher_photos (teacher_profile_id, sort_order);

-- 4. Event Teachers (assignment junction)
CREATE TABLE IF NOT EXISTS event_teachers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    teacher_profile_id  uuid NOT NULL REFERENCES teacher_profiles(id),
    role                varchar(20) NOT NULL DEFAULT 'lead'
                        CHECK (role IN ('lead','assistant')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, teacher_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_event_teachers_event ON event_teachers (event_id);
CREATE INDEX IF NOT EXISTS idx_event_teachers_teacher ON event_teachers (teacher_profile_id);

-- 5. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              uuid NOT NULL REFERENCES events(id),
    teacher_profile_id    uuid NOT NULL REFERENCES teacher_profiles(id),
    reviewer_id           uuid NOT NULL REFERENCES users(id),
    rating                integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text                  text,
    is_hidden             boolean NOT NULL DEFAULT false,
    hidden_reason         text,
    hidden_by             uuid REFERENCES users(id),
    review_window_closes_at timestamptz NOT NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, teacher_profile_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_teacher ON reviews (teacher_profile_id) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_reviews_event ON reviews (event_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews (reviewer_id);

-- 6. Teacher Requests (application workflow)
CREATE TABLE IF NOT EXISTS teacher_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id),
    bio             text,
    specialties     text[] NOT NULL DEFAULT '{}',
    credentials     jsonb NOT NULL DEFAULT '[]'::jsonb,
    status          varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
    reviewed_by     uuid REFERENCES users(id),
    reviewed_at     timestamptz,
    rejection_reason text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_requests_user ON teacher_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_requests_status ON teacher_requests (status) WHERE status = 'pending';

-- 7. Review Reminders
CREATE TABLE IF NOT EXISTS review_reminders (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events(id),
    user_id         uuid NOT NULL REFERENCES users(id),
    reminder_day    integer NOT NULL CHECK (reminder_day IN (1, 10)),
    sent_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id, reminder_day)
);

CREATE INDEX IF NOT EXISTS idx_review_reminders_event_user ON review_reminders (event_id, user_id);
