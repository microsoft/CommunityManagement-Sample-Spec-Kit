-- Migration: 015-001-notifications
-- Spec: 015-background-jobs-notifications
-- Creates tables for in-app notifications and notification preferences.

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          text        NOT NULL,
  title         text        NOT NULL,
  body          text,
  resource_type text,
  resource_id   uuid,
  read          boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread
  ON notifications (user_id) WHERE read = false;

COMMENT ON TABLE notifications IS
  'In-app notification records. Each row represents a notification delivered '
  'to a user. Cascade-deleted when the user is deleted (GDPR).';

-- Notification preferences (per user, per type, per channel)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type text        NOT NULL,
  channel           text        NOT NULL,
  enabled           boolean     NOT NULL DEFAULT true,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences (user_id);

COMMENT ON TABLE notification_preferences IS
  'Per-user, per-notification-type, per-channel preference toggles. '
  'Absence of a row means enabled (opt-out model). Cascade-deleted when the user is deleted.';
