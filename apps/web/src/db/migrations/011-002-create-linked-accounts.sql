-- Migration: 011-002-create-linked-accounts
-- Spec: 011-entra-external-id
-- Creates the linked_accounts table for multi-provider account linking.
-- Allows a platform user to authenticate with multiple social providers
-- (e.g. both Google and Apple) and always receive the same userId.

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

COMMENT ON COLUMN linked_accounts.user_id IS
  'FK to users.id. ON DELETE CASCADE ensures GDPR deletion removes all linked identities.';

COMMENT ON COLUMN linked_accounts.provider_oid IS
  'Entra External ID Object ID for this linked identity. '
  'UNIQUE constraint prevents the same social identity being linked to two platform accounts.';
