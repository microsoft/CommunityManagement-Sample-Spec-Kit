-- Migration: 007_user_directory
-- Spec 009: User Directory
-- Adds the directory_visible opt-in column to user_profiles.
-- No new tables — the directory reuses existing community tables.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS directory_visible BOOLEAN NOT NULL DEFAULT false;

-- Partial index: only covers rows where the feature is enabled, keeping it small
CREATE INDEX IF NOT EXISTS idx_user_profiles_directory
  ON user_profiles (directory_visible)
  WHERE directory_visible = true;
