-- Migration: 004_permissions
-- All 5 tables for permissions & creator accounts per data-model.md

-- 1. Geography reference table
CREATE TABLE geography (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city                   varchar(255) NOT NULL UNIQUE,
    country                varchar(255) NOT NULL,
    continent              varchar(100) NOT NULL,
    display_name_city      varchar(255) NOT NULL,
    display_name_country   varchar(255) NOT NULL,
    display_name_continent varchar(255) NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_geography_country ON geography (country);
CREATE INDEX idx_geography_continent ON geography (continent);

-- 2. Permission grants
CREATE TABLE permission_grants (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES users(id),
    role          varchar(50) NOT NULL
                  CHECK (role IN ('global_admin', 'country_admin', 'city_admin', 'event_creator')),
    scope_type    varchar(20) NOT NULL
                  CHECK (scope_type IN ('global', 'continent', 'country', 'city')),
    scope_value   varchar(255),
    granted_by    uuid NOT NULL REFERENCES users(id),
    granted_at    timestamptz NOT NULL DEFAULT now(),
    revoked_at    timestamptz,
    revoked_by    uuid REFERENCES users(id),
    CHECK (
        (scope_type = 'global' AND scope_value IS NULL)
        OR (scope_type != 'global' AND scope_value IS NOT NULL)
    )
);

CREATE INDEX idx_grants_user_active ON permission_grants (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_grants_scope ON permission_grants (scope_type, scope_value) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_grants_no_duplicate ON permission_grants (user_id, role, scope_type, scope_value)
    WHERE revoked_at IS NULL;

-- 3. Permission requests
CREATE TABLE permission_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id),
    requested_role  varchar(50) NOT NULL DEFAULT 'event_creator',
    scope_type      varchar(20) NOT NULL CHECK (scope_type IN ('city')),
    scope_value     varchar(255) NOT NULL,
    message         text,
    status          varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     uuid REFERENCES users(id),
    reviewed_at     timestamptz,
    review_reason   text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_requests_pending ON permission_requests (user_id, scope_type, scope_value)
    WHERE status = 'pending';
CREATE INDEX idx_requests_status_scope ON permission_requests (status, scope_type, scope_value);

-- 4. Creator payment accounts
CREATE TABLE creator_payment_accounts (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL UNIQUE REFERENCES users(id),
    stripe_account_id    varchar(255) NOT NULL UNIQUE,
    onboarding_complete  boolean NOT NULL DEFAULT false,
    connected_at         timestamptz NOT NULL DEFAULT now(),
    disconnected_at      timestamptz
);

-- 5. Permission audit log (append-only)
CREATE TABLE permission_audit_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL,
    action         varchar(50) NOT NULL
                   CHECK (action IN ('grant', 'revoke', 'check_denied',
                                     'request_submitted', 'request_approved', 'request_rejected')),
    role           varchar(50),
    scope_type     varchar(20),
    scope_value    varchar(255),
    performed_by   uuid,
    metadata       jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON permission_audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_action ON permission_audit_log (action, created_at DESC);
CREATE INDEX idx_audit_created ON permission_audit_log (created_at DESC);
