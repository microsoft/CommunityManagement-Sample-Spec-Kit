-- Migration: 003_community_social
-- All 10 tables for Community & Social Features per Spec 002

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL UNIQUE REFERENCES users(id),
    display_name    varchar(255),
    bio             text,
    home_city_id    uuid REFERENCES cities(id),
    default_role    varchar(20) CHECK (default_role IN ('base','flyer','hybrid')),
    avatar_url      varchar(2048),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles (home_city_id);

-- 2. Social Links
CREATE TABLE IF NOT EXISTS social_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id),
    platform    varchar(50) NOT NULL CHECK (platform IN ('facebook','instagram','youtube','website')),
    url         varchar(2048) NOT NULL,
    visibility  varchar(20) NOT NULL DEFAULT 'everyone'
                CHECK (visibility IN ('everyone','followers','friends','hidden')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_links_user ON social_links (user_id);

-- 3. Follows
CREATE TABLE IF NOT EXISTS follows (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id uuid NOT NULL REFERENCES users(id),
    followee_id uuid NOT NULL REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (follower_id, followee_id),
    CONSTRAINT follows_no_self CHECK (follower_id != followee_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id);

-- 4. Threads
CREATE TABLE IF NOT EXISTS threads (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type varchar(20) NOT NULL CHECK (entity_type IN ('event','city','country')),
    entity_id   uuid NOT NULL,
    is_locked   boolean NOT NULL DEFAULT false,
    locked_by   uuid REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id)
);

-- 5. Messages
CREATE TABLE IF NOT EXISTS messages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id    uuid NOT NULL REFERENCES threads(id),
    author_id    uuid NOT NULL REFERENCES users(id),
    content      text NOT NULL,
    edit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_pinned    boolean NOT NULL DEFAULT false,
    pinned_by    uuid REFERENCES users(id),
    is_deleted   boolean NOT NULL DEFAULT false,
    deleted_by   uuid REFERENCES users(id),
    created_at   timestamptz NOT NULL DEFAULT now(),
    edited_at    timestamptz,
    CONSTRAINT messages_content_length CHECK (char_length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages (author_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages (thread_id) WHERE is_pinned = true;

-- 6. Reactions
CREATE TABLE IF NOT EXISTS reactions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id),
    emoji      varchar(20) NOT NULL CHECK (emoji IN ('thumbs_up','heart','fire','laugh','sad','celebrate')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions (message_id);

-- 7. Blocks
CREATE TABLE IF NOT EXISTS blocks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL REFERENCES users(id),
    blocked_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (blocker_id, blocked_id),
    CONSTRAINT blocks_no_self CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks (blocked_id);

-- 8. Mutes
CREATE TABLE IF NOT EXISTS mutes (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    muter_id  uuid NOT NULL REFERENCES users(id),
    muted_id  uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (muter_id, muted_id),
    CONSTRAINT mutes_no_self CHECK (muter_id != muted_id)
);

CREATE INDEX IF NOT EXISTS idx_mutes_muter ON mutes (muter_id);

-- 9. Reports
CREATE TABLE IF NOT EXISTS reports (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id      uuid NOT NULL REFERENCES users(id),
    reported_user_id uuid NOT NULL REFERENCES users(id),
    reason           varchar(30) NOT NULL CHECK (reason IN ('harassment','spam','inappropriate','other')),
    details          text,
    status           varchar(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','reviewed','actioned','dismissed')),
    reviewed_by      uuid REFERENCES users(id),
    created_at       timestamptz NOT NULL DEFAULT now(),
    reviewed_at      timestamptz,
    CONSTRAINT reports_no_self CHECK (reporter_id != reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports (reported_user_id);

-- 10. Data Exports
CREATE TABLE IF NOT EXISTS data_exports (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id),
    status     varchar(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','processing','completed','failed')),
    file_url   text,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_exports (user_id);

-- Sentinel user for GDPR: anonymised/deleted user placeholder
INSERT INTO users (id, email, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'deleted@system.local', 'Deleted User')
ON CONFLICT (id) DO NOTHING;
