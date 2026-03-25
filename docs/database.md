# Database Schema Documentation

> **Engine**: PostgreSQL 15+  
> **Development**: PGlite (in-memory PostgreSQL via `@electric-sql/pglite`)  
> **Production**: Azure PostgreSQL Flexible Server with Managed Identity authentication  
> **ORM**: None — raw SQL with `node-pg` and parameterized queries

## Connection Strategy

The application uses three connection modes (in `apps/web/src/db/client.ts`):

| Mode | When | Auth |
|------|------|------|
| **Managed Identity** | `PGHOST` + `AZURE_CLIENT_ID` set | Azure Entra token via `DefaultAzureCredential` |
| **PGlite** | `DATABASE_URL` unset or `"pglite"` | File-backed local database |
| **Standard PostgreSQL** | `DATABASE_URL` set | Connection string |

## Migration System

- Migrations live in `apps/web/src/db/migrations/`
- Each migration is a plain SQL file, executed alphabetically
- Tracked in a `_migrations` table to ensure idempotent execution
- Run manually: `npm run db:migrate -w @acroyoga/web`
- In tests: `createTestDb()` applies all migrations to a fresh PGlite instance

### Migration Files

| File | Spec | Description |
|------|------|-------------|
| `001_users.sql` | Foundation | Users table |
| `002_events.sql` | 001 | Events, venues, cities, countries, RSVPs, waitlist, credits |
| `003_community_social.sql` | 002 | Profiles, follows, threads, messages, blocks, mutes, reports |
| `004_permissions.sql` | 004 | Geography, permission grants, requests, audit log, payment accounts |
| `005_recurring_multiday.sql` | 003 | Occurrence overrides, event groups, ticket types, bookings, concessions |
| `006_teachers_reviews.sql` | 005 | Teacher profiles, certifications, photos, reviews, applications |
| `007_user_directory.sql` | 009 | Directory visibility flag, social link platform expansion, partial indexes |
| `008_home_city_geography_fk.sql` | 009 | Repoints user_profiles.home_city_id to geography table |
| `011-001-add-social-auth-columns.sql` | 011 | Social auth fields on users (provider, provider_oid, avatar_url) |
| `011-002-create-linked-accounts.sql` | 011 | Account linking table for multi-provider auth |

### Dependency Order

```
001_users (foundation)
  ├── 002_events (references: users)
  │     ├── 005_recurring_multiday (references: events, users)
  │     └── 006_teachers_reviews (references: events, users)
  ├── 003_community_social (references: users)
  │     └── 007_user_directory (alters: user_profiles, social_links)
  │           └── 008_home_city_geography_fk (alters: user_profiles FK)
  ├── 004_permissions (references: users)
  ├── 011-001-add-social-auth-columns (alters: users)
  └── 011-002-create-linked-accounts (references: users)
```

## Table Inventory

### Core Reference Tables

| Table | Rows (typical) | Purpose |
|-------|----------------|---------|
| `users` | — | User identities (email, social provider, avatar) |
| `countries` | ~200 | Country reference data (name, ISO code, continent) |
| `cities` | ~500 | City reference data (name, slug, coordinates, timezone) |
| `geography` | ~500 | Denormalized location hierarchy (city/country/continent display names) |

### Events Domain (Spec 001)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `venues` | Physical event locations | → cities, → users (creator) |
| `events` | Core event records | → venues, → users (creator) |
| `rsvps` | Event attendance | → events, → users |
| `waitlist` | Event waitlist entries | → events, → users |
| `event_interests` | User interest tracking | → events, → users |
| `credits` | Cancellation credit balance | → users (holder, creator), → events, → rsvps |

### Community & Social Domain (Spec 002)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `user_profiles` | Extended user profile data | → users (1:1), → geography (home city) |
| `social_links` | Social media platform links | → users |
| `follows` | Follow relationships | → users (follower, followee) |
| `threads` | Discussion threads | → users (locked_by) |
| `messages` | Thread messages | → threads, → users (author) |
| `reactions` | Message emoji reactions | → messages (CASCADE), → users |
| `blocks` | User blocks | → users (blocker, blocked) |
| `mutes` | User mutes | → users (muter, muted) |
| `reports` | Content/user reports | → users (reporter, reported, reviewer) |
| `data_exports` | GDPR data export requests | → users |

### Permissions Domain (Spec 004)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `permission_grants` | Role assignments with geographic scope | → users (grantee, grantor, revoker) |
| `permission_requests` | Permission escalation requests | → users (requester, reviewer) |
| `creator_payment_accounts` | Stripe Connect accounts | → users (1:1) |
| `permission_audit_log` | Append-only audit trail | None (intentionally denormalized) |

### Recurring Events Domain (Spec 003)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `occurrence_overrides` | Per-date overrides for recurring events | → events, → users (creator) |
| `event_groups` | Festival/combo/series groupings | → users (creator) |
| `event_group_members` | Events in a group | → event_groups (CASCADE), → events |
| `ticket_types` | Ticket pricing tiers for groups | → event_groups (CASCADE) |
| `ticket_type_events` | Ticket-to-event coverage mapping | → ticket_types (CASCADE), → events |
| `bookings` | Ticket bookings | → ticket_types, → users |
| `concession_statuses` | Concession pricing eligibility | → users (applicant, approver, revoker) |

### Teachers Domain (Spec 005)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `teacher_profiles` | Instructor profiles | → users (1:1) |
| `certifications` | Teaching credentials | → teacher_profiles (CASCADE), → users (verifier) |
| `teacher_photos` | Portfolio photos | → teacher_profiles (CASCADE) |
| `event_teachers` | Teacher-event assignments | → events (CASCADE), → teacher_profiles |
| `reviews` | Teacher reviews by attendees | → events, → teacher_profiles, → users (reviewer) |
| `teacher_requests` | Teacher application workflow | → users (applicant, reviewer) |
| `review_reminders` | Review reminder tracking | → events, → users |

### Authentication Domain (Spec 011)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `linked_accounts` | Multi-provider account linking | → users (CASCADE) |

## Key Design Patterns

### UUID Primary Keys

All tables use `uuid` primary keys with `gen_random_uuid()` default. This supports distributed ID generation and prevents enumeration attacks.

### Soft Delete

- `events`: Uses `status = 'cancelled'` + `cancelled_at` timestamp
- `teacher_profiles`: Uses `is_deleted` boolean + `deleted_at` timestamp
- `messages`: Uses `is_deleted` boolean + `deleted_by` reference
- `rsvps`: Uses `status = 'cancelled'` + `cancelled_at` timestamp

### GDPR Deletion

A sentinel user (`id: 00000000-0000-0000-0000-000000000000`, `email: deleted@system.local`) is seeded by migration 003. When a user deletes their account, their PII is replaced and their `id` is reassigned to the sentinel for referential integrity.

### Partial Indexes

Many tables use partial indexes to optimize common query patterns:

- `idx_events_status` — only `WHERE status = 'published'` (skip cancelled/draft)
- `idx_rsvps_unique` — unique constraint only `WHERE status != 'cancelled'`
- `idx_grants_user_active` — only `WHERE revoked_at IS NULL`
- `idx_profiles_directory_visible` — only `WHERE directory_visible = true`

### Geographic Scoping

Permissions use a hierarchical scope model:

```
Global → Continent → Country → City
```

The `geography` table provides denormalized lookup for scope resolution. The `permission_grants` table links users to roles at specific scope levels.

### Audit Trail

The `permission_audit_log` table is append-only with no foreign keys (intentionally denormalized for durability). It tracks all permission operations: `grant`, `revoke`, `check_denied`, `request_submitted`, `request_approved`, `request_rejected`.

## Entity-Relationship Overview

```
users ─────────────┬──── user_profiles ──── geography
  │                │         │
  │                │    social_links
  │                │
  ├── events ──────┼──── venues ──── cities ──── countries
  │     │          │
  │     ├── rsvps  ├── follows
  │     ├── waitlist ├── blocks
  │     ├── event_interests ├── mutes
  │     ├── occurrence_overrides ├── reports
  │     ├── event_teachers ──── teacher_profiles
  │     │                          ├── certifications
  │     │                          ├── teacher_photos
  │     │                          └── reviews
  │     └── event_group_members ──── event_groups
  │                                    └── ticket_types
  │                                         ├── ticket_type_events
  │                                         └── bookings
  │
  ├── permission_grants
  ├── permission_requests
  ├── creator_payment_accounts
  ├── concession_statuses
  ├── data_exports
  ├── linked_accounts
  ├── threads ──── messages ──── reactions
  └── teacher_requests
```

## Event Categories

The `events.category` column supports these values:

| Category | Description |
|----------|-------------|
| `jam` | Open practice session |
| `workshop` | Structured learning |
| `class` | Regular scheduled class |
| `festival` | Multi-day event |
| `social` | Community gathering |
| `retreat` | Extended residential event |
| `teacher_training` | Instructor certification |

## Permission Roles

| Role | Scope Types | Capabilities |
|------|-------------|-------------|
| `global_admin` | `global` | Full platform management |
| `country_admin` | `country` | Manage resources within a country |
| `city_admin` | `city` | Manage resources within a city |
| `event_creator` | `city` | Create events and venues within a city |

## Statistics

- **Total tables**: 39
- **Total columns**: 500+
- **Total indexes**: 90+ (many partial for query performance)
- **Foreign key relationships**: 60+
- **Cascade deletes**: reactions, linked_accounts, event_group_members, ticket_types, ticket_type_events, certifications, teacher_photos, event_teachers

---

*For migration details, see the SQL files in `apps/web/src/db/migrations/`. For testing patterns with PGlite, see `docs/testing.md`.*
