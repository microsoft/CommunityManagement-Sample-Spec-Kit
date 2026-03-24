-- Migration: 011-001-add-social-auth-columns
-- Spec: 011-entra-external-id
-- Extends the users table with social identity and profile columns required
-- for Entra External ID sign-in. Also relaxes the NOT NULL constraint on
-- email to accommodate Apple relay-email / private-email users.

-- Allow null emails for social auth (e.g. Apple private relay)
ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;

-- Remove the unique constraint on email before adding new social columns
-- (partial unique index is safer — allows NULL but enforces unique non-null values)
DROP INDEX IF EXISTS idx_users_email;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (email)
  WHERE email IS NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS provider       TEXT,
  ADD COLUMN IF NOT EXISTS provider_oid   TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique partial index on provider_oid: NULLs are excluded from uniqueness.
-- Using ALTER TABLE constraint so ON CONFLICT (provider_oid) works in upserts.
ALTER TABLE users
  ADD CONSTRAINT users_provider_oid_unique UNIQUE (provider_oid);

COMMENT ON COLUMN users.provider IS
  'Name of the primary social identity provider used at first sign-in (google, facebook, apple).';
COMMENT ON COLUMN users.provider_oid IS
  'Entra External ID Object ID (oid claim). Stable cross-session identifier. '
  'Used to look up the user on sign-in without relying on email.';
COMMENT ON COLUMN users.avatar_url IS
  'Profile photo URL from the social provider. Refreshed on each sign-in.';
COMMENT ON COLUMN users.updated_at IS
  'Timestamp of last profile update (name, email, or avatar refresh from social provider).';
