# Data Model: Entra External ID — Social Login Federation

**Spec**: 011 | **Date**: 2026-03-22

---

## Overview

This spec introduces two schema changes to support Entra External ID social login:

1. **Extend `users` table** — add `provider`, `provider_oid`, and `avatar_url` columns for social identity binding.
2. **New `linked_accounts` table** — supports linking multiple social provider identities to one platform user account.

The `auth_sessions` and permission system are unchanged. The `userId` in all existing code continues to be the platform UUID from `users.id`.

---

## Entity Relationship Overview

```
                    ┌─────────────────────────────────────┐
                    │  Entra External ID (external)        │
                    │  Issues ID token with `oid` claim    │
                    └───────────────────┬─────────────────┘
                                        │ oid
                    ┌───────────────────▼─────────────────┐
                    │           users                      │
                    │  id (UUID) ← platform userId         │
                    │  provider_oid (TEXT, UNIQUE)          │
                    │  provider (TEXT)                     │
                    │  email (TEXT)                        │
                    │  display_name (TEXT)                 │
                    │  avatar_url (TEXT)                   │
                    │  created_at (TIMESTAMPTZ)            │
                    │  updated_at (TIMESTAMPTZ)            │
                    └─────────────────┬───────────────────┘
                                      │ 1:N
                    ┌─────────────────▼───────────────────┐
                    │        linked_accounts               │
                    │  id (UUID)                           │
                    │  user_id → users.id                  │
                    │  provider (TEXT)                     │
                    │  provider_oid (TEXT, UNIQUE)          │
                    │  linked_at (TIMESTAMPTZ)             │
                    └─────────────────────────────────────┘
```

---

## Database Changes

### Migration 011-001: Extend users Table

```sql
-- Migration: 011-001-add-social-auth-columns.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS provider       TEXT,
  ADD COLUMN IF NOT EXISTS provider_oid   TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique index on provider_oid — this is the stable cross-session lookup key.
-- NULLS are excluded from uniqueness enforcement (pre-existing rows have NULL).
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_oid_unique
  ON users (provider_oid)
  WHERE provider_oid IS NOT NULL;

COMMENT ON COLUMN users.provider IS
  'Name of the primary social identity provider used at first sign-in (google, facebook, apple).';
COMMENT ON COLUMN users.provider_oid IS
  'Entra External ID Object ID (oid claim). Stable cross-session identifier. '
  'Used to look up the user on sign-in without relying on email.';
COMMENT ON COLUMN users.avatar_url IS
  'Profile photo URL from the social provider. Refreshed on each sign-in.';
COMMENT ON COLUMN users.updated_at IS
  'Timestamp of last profile update (name, email, or avatar refresh from social provider).';
```

### Migration 011-002: Create linked_accounts Table

```sql
-- Migration: 011-002-create-linked-accounts.sql

CREATE TABLE IF NOT EXISTS linked_accounts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT        NOT NULL,
  provider_oid  TEXT        NOT NULL,
  linked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT linked_accounts_provider_oid_unique UNIQUE (provider_oid)
);

CREATE INDEX IF NOT EXISTS linked_accounts_user_id_idx
  ON linked_accounts (user_id);

COMMENT ON TABLE linked_accounts IS
  'Additional social provider identities linked to a platform user account. '
  'Allows a user to sign in with multiple social providers (Google AND Apple) '
  'and always receive the same platform userId.';
COMMENT ON COLUMN linked_accounts.provider_oid IS
  'Entra External ID Object ID for this linked identity. '
  'UNIQUE constraint prevents the same social identity being linked to two platform accounts.';
```

---

## Entity Definitions

### users (extended)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NOT NULL | Platform user ID (primary key, unchanged) |
| display_name | TEXT | NULL | Display name from social provider or user-set |
| email | TEXT | NULL | Email from social provider; may be null for Apple relay users |
| provider | TEXT | NULL | Primary social provider name (`google`, `facebook`, `apple`) |
| provider_oid | TEXT | NULL | Entra External ID oid claim (stable, unique when set) |
| avatar_url | TEXT | NULL | Profile photo URL from social provider |
| created_at | TIMESTAMPTZ | NOT NULL | Unchanged |
| updated_at | TIMESTAMPTZ | NOT NULL | Added by migration 011-001 |
| *(other existing columns)* | | | Unchanged |

**Constraints added**:
- Partial unique index on `provider_oid WHERE provider_oid IS NOT NULL`

**Existing rows**: `provider`, `provider_oid`, `avatar_url` default to NULL for existing mock/test users. No data migration needed.

---

### linked_accounts (new)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NOT NULL | Primary key |
| user_id | UUID | NOT NULL | FK → users.id (CASCADE DELETE for GDPR) |
| provider | TEXT | NOT NULL | Social provider name (`google`, `facebook`, `apple`) |
| provider_oid | TEXT | NOT NULL | Entra External ID oid for this linked identity |
| linked_at | TIMESTAMPTZ | NOT NULL | When the link was created |

**Constraints**:
- `UNIQUE (provider_oid)` — one platform account per social identity (enforces non-duplication across all accounts)
- `REFERENCES users(id) ON DELETE CASCADE` — deleting a user cascades to linked accounts (GDPR deletion)

---

## Lookup Logic

### Sign-In User Lookup

On every sign-in, the `signIn` callback performs a combined lookup to resolve an existing platform `userId`:

```sql
-- Try to find the user by primary oid OR linked account oid
SELECT u.id
FROM users u
WHERE u.provider_oid = $oid

UNION ALL

SELECT la.user_id
FROM linked_accounts la
WHERE la.provider_oid = $oid

LIMIT 1;
```

If the query returns a row → existing user, return `userId`.  
If no row → new user, execute the upsert and return the new `id`.

---

### User Provisioning Upsert

```sql
INSERT INTO users (id, provider_oid, email, display_name, avatar_url, provider, created_at, updated_at)
VALUES (gen_random_uuid(), $oid, $email, $name, $avatar_url, $provider, now(), now())
ON CONFLICT (provider_oid)
DO UPDATE SET
  email        = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  avatar_url   = EXCLUDED.avatar_url,
  updated_at   = now()
RETURNING id;
```

**Idempotent**: Running this upsert N times for the same `oid` produces exactly one user row.

---

## GDPR Compliance

### Deletion (updated from existing GDPR function)

```sql
-- Step 1: Delete linked accounts (also handled by CASCADE, but explicit for clarity)
DELETE FROM linked_accounts WHERE user_id = $userId;

-- Step 2: Anonymise user record (hard-delete PII fields per Constitution III)
UPDATE users SET
  email        = '[deleted]',
  display_name = '[deleted]',
  provider_oid = NULL,
  avatar_url   = NULL,
  provider     = NULL,
  updated_at   = now()
WHERE id = $userId;
```

### Data Export (updated from existing GDPR function)

Include in JSON export:
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "display_name": "...",
    "provider": "google",
    "avatar_url": "...",
    "created_at": "..."
  },
  "linked_accounts": [
    { "provider": "apple", "linked_at": "..." }
  ]
}
```

**Note**: `provider_oid` values are excluded from the export as they are internal Entra identifiers not meaningful to the user.

---

## State Transitions

### First Social Login

```
Visitor → clicks "Sign in" → Entra External ID authentication → 
signIn callback fires →
  lookup by oid → not found →
  INSERT INTO users → new userId →
  INSERT INTO linked_accounts (optional, or rely on users.provider_oid) →
JWT callback → session.user.id = userId →
User lands on platform as Member
```

### Returning Social Login

```
Returning user → signs in → Entra External ID authentication →
signIn callback fires →
  lookup by oid → found (users.provider_oid = oid) →
  UPDATE users SET email, display_name, avatar_url, updated_at →
  return existing userId →
JWT callback → session.user.id = same userId as before →
User lands on platform with all history intact
```

### Account Linking

```
Authenticated user (userId = "abc") → links Apple account →
Entra External ID issues Apple-federated token (oid = "apple-oid-xyz") →
Link callback:
  lookup apple-oid-xyz → not found (no conflict) →
  INSERT INTO linked_accounts (user_id = "abc", provider = "apple", provider_oid = "apple-oid-xyz") →
  Return 200 success
→ User can now sign in with Apple and receive userId = "abc"
```

### Account Linking Conflict (Error Case)

```
Authenticated user (userId = "abc") → tries to link Apple account →
apple-oid-xyz is already in linked_accounts for userId = "def" →
→ Return 409 Conflict
→ User sees error: "This Apple account is already linked to another profile"
```

---

## PII Classification

| Field | Table | Classification | Retention |
|-------|-------|---------------|-----------|
| email | users | PII | Anonymised on GDPR deletion |
| display_name | users | PII | Anonymised on GDPR deletion |
| avatar_url | users | PII (profile photo) | Cleared on GDPR deletion |
| provider_oid | users | Pseudonymous identifier | Cleared on GDPR deletion |
| provider | users | Non-PII | Cleared on GDPR deletion (for completeness) |
| provider_oid | linked_accounts | Pseudonymous identifier | CASCADE deleted on GDPR deletion |
