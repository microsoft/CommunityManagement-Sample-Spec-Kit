# Data Model: Mock Authentication with Sample Users

**Spec**: 007 | **Date**: 2026-03-16

---

## Overview

This feature introduces **no new database tables**. It defines a set of **sample user records** and **permission grant records** that are inserted into the existing `users` and `permission_grants` tables (from migrations 001 and 004). Reference data (countries, cities, geography) is inserted into existing tables from migration 002 and 004.

---

## Sample Users

All sample users use **deterministic UUIDs** for stability across seed runs and test environments.

| Slug | UUID | Name | Email | Role | Scope |
|------|------|------|-------|------|-------|
| `global-admin` | `00000000-0000-4000-a000-000000000001` | Alice Global | alice@example.com | `global_admin` | global |
| `uk-country-admin` | `00000000-0000-4000-a000-000000000002` | Bob United Kingdom | bob@example.com | `country_admin` | country:uk |
| `bristol-city-admin` | `00000000-0000-4000-a000-000000000003` | Charlie Bristol | charlie@example.com | `city_admin` | city:bristol |
| `bristol-creator` | `00000000-0000-4000-a000-000000000004` | Diana Creator | diana@example.com | `event_creator` | city:bristol |
| `regular-member` | `00000000-0000-4000-a000-000000000005` | Eve Member | eve@example.com | *(none)* | *(no grants)* |
| `anonymous` | *(no DB record)* | *(no session)* | — | `visitor` | — |

### Users Table Records (existing schema)

Inserted into `users` (migration 001):

```sql
INSERT INTO users (id, email, name) VALUES
  ('00000000-0000-4000-a000-000000000001', 'alice@example.com', 'Alice Global'),
  ('00000000-0000-4000-a000-000000000002', 'bob@example.com', 'Bob United Kingdom'),
  ('00000000-0000-4000-a000-000000000003', 'charlie@example.com', 'Charlie Bristol'),
  ('00000000-0000-4000-a000-000000000004', 'diana@example.com', 'Diana Creator'),
  ('00000000-0000-4000-a000-000000000005', 'eve@example.com', 'Eve Member')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
```

### Permission Grants Records (existing schema)

Inserted into `permission_grants` (migration 004):

| User | role | scope_type | scope_value | granted_by |
|------|------|-----------|-------------|------------|
| Alice Global | `global_admin` | `global` | `NULL` | self |
| Bob UK | `country_admin` | `country` | `uk` | Alice |
| Charlie Bristol | `city_admin` | `city` | `bristol` | Bob |
| Diana Creator | `event_creator` | `city` | `bristol` | Charlie |
| Eve Member | *(no grant)* | — | — | — |

### Geography Records (existing schema)

Inserted into `geography` (migration 004) to satisfy scope references:

| city | country | continent |
|------|---------|-----------|
| `bristol` | `uk` | `europe` |

*(Already exists in the geography seed — the seed function is idempotent via `ON CONFLICT DO NOTHING`.)*

### Cities/Countries Records (existing schema)

Inserted into `countries` and `cities` (migration 002) if not already present:

- Country: United Kingdom (code: `GB`)
- City: Bristol (slug: `bristol`, country: GB)

*(Already exist in existing `src/db/seeds/cities.ts` data.)*

---

## State Diagram: Mock User Session

```
┌──────────────┐    setMockUser(id)    ┌──────────────┐
│              │ ───────────────────►   │              │
│  Anonymous   │                       │ Authenticated │
│  (null)      │   ◄───────────────── │ as Sample User│
│              │    setMockUser(null)   │              │
└──────────────┘                       └──────────────┘
       │                                      │
       │  getServerSession()                  │  getServerSession()
       ▼                                      ▼
   returns null                          returns { userId }
```

---

## Relationships

```
users (001_users.sql)
  ├── 1:N ── permission_grants (004_permissions.sql)
  │            └── scope references geography.city / geography.country
  └── session.userId ── getServerSession() return value
```

No new foreign keys. No schema changes. The mock auth layer operates entirely at the application level, producing sessions that reference existing user rows.

---

## Validation Rules

- Sample user UUIDs must be valid UUID v4 format
- Sample user emails must be unique (enforced by `users.email` UNIQUE constraint)
- Permission grants must satisfy the CHECK constraint: `scope_type = 'global' AND scope_value IS NULL` OR `scope_type != 'global' AND scope_value IS NOT NULL`
- Seed is idempotent: uses `ON CONFLICT` for upserts
- The `anonymous` pseudo-user has no database record — it represents `getServerSession()` returning `null`
