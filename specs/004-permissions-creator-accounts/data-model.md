# Data Model: Permissions & Creator Accounts

**Spec**: 004 | **Date**: 2026-03-15

---

## Entity Relationship Overview

```
┌─────────────┐       ┌──────────────────┐       ┌────────────────┐
│    users     │──1:N──│ permission_grants │──N:1──│   geography    │
│  (from auth) │       └──────────────────┘       └────────────────┘
│              │                                         │
│              │──1:N──┌────────────────────┐            │
│              │       │ permission_requests │────────────┘
│              │       └────────────────────┘
│              │
│              │──1:1──┌──────────────────────────┐
│              │       │ creator_payment_accounts  │
│              │       └──────────────────────────┘
│              │
│              │──1:N──┌──────────────────────┐
└─────────────┘       │ permission_audit_log  │
                      └──────────────────────┘
```

---

## Entities

### 1. geography

Reference table mapping cities to their country and continent. Used for scope hierarchy resolution.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| city | varchar(255) | NOT NULL, UNIQUE | Canonical city name (e.g., "bristol") |
| country | varchar(255) | NOT NULL | ISO-like key (e.g., "uk") |
| continent | varchar(100) | NOT NULL | (e.g., "europe") |
| display_name_city | varchar(255) | NOT NULL | Human-readable (e.g., "Bristol") |
| display_name_country | varchar(255) | NOT NULL | (e.g., "United Kingdom") |
| display_name_continent | varchar(255) | NOT NULL | (e.g., "Europe") |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_geography_city` on `(city)` — UNIQUE
- `idx_geography_country` on `(country)`
- `idx_geography_continent` on `(continent)`

**Seed data**: Populated from a static dataset of active AcroYoga cities. New cities added via admin action.

---

### 2. permission_grants

Core permission storage. Each row is a grant of a role at a specific geographic scope to a user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → users(id) | The user receiving the grant |
| role | varchar(50) | NOT NULL, CHECK (role IN ('global_admin', 'country_admin', 'city_admin', 'event_creator')) | Member is implicit (all authenticated users) |
| scope_type | varchar(20) | NOT NULL, CHECK (scope_type IN ('global', 'continent', 'country', 'city')) | |
| scope_value | varchar(255) | NULL | NULL for global scope; otherwise geography key |
| granted_by | uuid | NOT NULL, FK → users(id) | Admin who granted |
| granted_at | timestamptz | NOT NULL, DEFAULT now() | |
| revoked_at | timestamptz | NULL | NULL = active; set on revoke (soft delete) |
| revoked_by | uuid | NULL, FK → users(id) | Admin who revoked |

**Validation rules**:
- `scope_value` MUST be NULL when `scope_type = 'global'`
- `scope_value` MUST NOT be NULL when `scope_type != 'global'`
- `scope_value` must reference a valid entry in `geography` for the corresponding scope level
- `role = 'global_admin'` requires `scope_type = 'global'`

**Indexes**:
- `idx_grants_user_active` on `(user_id) WHERE revoked_at IS NULL` — primary lookup for permission checks
- `idx_grants_scope` on `(scope_type, scope_value) WHERE revoked_at IS NULL` — admin panel filtering
- `UNIQUE idx_grants_no_duplicate` on `(user_id, role, scope_type, scope_value) WHERE revoked_at IS NULL` — prevent duplicate active grants

**Check constraint**:
```sql
CHECK (
  (scope_type = 'global' AND scope_value IS NULL)
  OR (scope_type != 'global' AND scope_value IS NOT NULL)
)
```

---

### 3. permission_requests

Self-service Event Creator role requests with admin approval workflow.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → users(id) | Requester |
| requested_role | varchar(50) | NOT NULL, DEFAULT 'event_creator' | Only event_creator for self-service (FR-12) |
| scope_type | varchar(20) | NOT NULL, CHECK (scope_type IN ('city')) | Event creators are city-scoped |
| scope_value | varchar(255) | NOT NULL | City key from geography |
| message | text | NULL | Optional message from requester |
| status | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'approved', 'rejected')) | |
| reviewed_by | uuid | NULL, FK → users(id) | Admin who reviewed |
| reviewed_at | timestamptz | NULL | |
| review_reason | text | NULL | Reason for approval/rejection |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Validation rules**:
- Only one pending request per `(user_id, scope_type, scope_value)` at a time
- `requested_role` must be `'event_creator'` (admin roles are admin-only grants — FR-12)
- Rejected requests do not block resubmission; only pending requests block duplicates

**Indexes**:
- `UNIQUE idx_requests_pending` on `(user_id, scope_type, scope_value) WHERE status = 'pending'` — enforce one pending per scope
- `idx_requests_status_scope` on `(status, scope_type, scope_value)` — admin panel: list pending requests for scope

**State transitions**:
```
pending → approved  (admin action → creates permission_grant)
pending → rejected  (admin action → no grant created)
rejected → [user can create new request]
```

---

### 4. creator_payment_accounts

Stripe Connect Standard linked accounts for Event Creators.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, UNIQUE, FK → users(id) | One Stripe account per user |
| stripe_account_id | varchar(255) | NOT NULL, UNIQUE | Stripe connected account ID (acct_xxx) |
| onboarding_complete | boolean | NOT NULL, DEFAULT false | True when Stripe confirms full onboarding |
| connected_at | timestamptz | NOT NULL, DEFAULT now() | |
| disconnected_at | timestamptz | NULL | Set if account is disconnected |

**Validation rules**:
- User must have an active Event Creator grant to initiate Stripe Connect
- `stripe_account_id` is unique across the platform
- `onboarding_complete` updated via Stripe webhook (`account.updated`)

**Indexes**:
- `UNIQUE idx_payment_user` on `(user_id)` — one account per user
- `UNIQUE idx_payment_stripe` on `(stripe_account_id)`

---

### 5. permission_audit_log

Append-only audit trail for all permission-related actions.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL | The user whose permissions are affected |
| action | varchar(50) | NOT NULL, CHECK (action IN ('grant', 'revoke', 'check_denied', 'request_submitted', 'request_approved', 'request_rejected')) | |
| role | varchar(50) | NULL | Role involved (null for check_denied on visitor) |
| scope_type | varchar(20) | NULL | |
| scope_value | varchar(255) | NULL | |
| performed_by | uuid | NULL | Admin performing the action (null for self-service or system) |
| metadata | jsonb | NULL | Extensible context (e.g., denied action attempted, IP, user agent) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_audit_user` on `(user_id, created_at DESC)` — per-user audit history
- `idx_audit_action` on `(action, created_at DESC)` — filter by action type
- `idx_audit_created` on `(created_at DESC)` — chronological listing

**Note**: This table is append-only. No UPDATE or DELETE operations. Rows are never modified after insertion.

---

## Migration SQL

```sql
-- Migration: 004_permissions
-- Depends on: users table (from auth setup)

-- 1. Geography reference table
CREATE TABLE geography (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city          varchar(255) NOT NULL UNIQUE,
    country       varchar(255) NOT NULL,
    continent     varchar(100) NOT NULL,
    display_name_city      varchar(255) NOT NULL,
    display_name_country   varchar(255) NOT NULL,
    display_name_continent varchar(255) NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
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

-- 5. Permission audit log
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
```

---

## Scope Hierarchy Mapping

```
global
├── europe (continent)
│   ├── uk (country)
│   │   ├── bristol (city)
│   │   ├── london (city)
│   │   └── ...
│   ├── france (country)
│   │   ├── paris (city)
│   │   └── ...
│   └── ...
├── north_america (continent)
│   ├── us (country)
│   │   ├── san_francisco (city)
│   │   └── ...
│   └── ...
└── ...
```

**Resolution order**: When checking if a grant covers a target scope, walk up from the target:
1. Exact match: `grant.scope_type == target.scope_type AND grant.scope_value == target.scope_value`
2. Parent match: `grant.scope_type == 'country' AND geography[target.city].country == grant.scope_value`
3. Grandparent match: `grant.scope_type == 'continent' AND geography[target.city].continent == grant.scope_value`
4. Global match: `grant.scope_type == 'global'`
