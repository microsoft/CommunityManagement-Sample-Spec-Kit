-- Migration: 007_user_directory
-- Spec 009: User Directory
-- Adds the directory_visible opt-in column to user_profiles.
-- Expands social_links platform CHECK constraint from 4 to 8 values.
-- No new tables — the directory reuses existing community tables.

-- 1. Add directory_visible column with privacy-first default
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS directory_visible BOOLEAN NOT NULL DEFAULT false;

-- 2. Expand social_links platform enum from 4 → 8 values
ALTER TABLE social_links DROP CONSTRAINT IF EXISTS social_links_platform_check;
ALTER TABLE social_links ADD CONSTRAINT social_links_platform_check
  CHECK (platform IN (
    'facebook', 'instagram', 'youtube', 'website',
    'tiktok', 'twitter_x', 'linkedin', 'threads'
  ));

-- 3. Partial indexes for directory queries (only directory-visible rows)
CREATE INDEX IF NOT EXISTS idx_profiles_directory_visible
  ON user_profiles (id)
  WHERE directory_visible = true;

CREATE INDEX IF NOT EXISTS idx_profiles_role_visible
  ON user_profiles (default_role, id)
  WHERE directory_visible = true;

CREATE INDEX IF NOT EXISTS idx_profiles_name_visible
  ON user_profiles (lower(display_name) text_pattern_ops, id)
  WHERE directory_visible = true;

CREATE INDEX IF NOT EXISTS idx_profiles_created_visible
  ON user_profiles (created_at DESC, id DESC)
  WHERE directory_visible = true;

CREATE INDEX IF NOT EXISTS idx_profiles_city_visible
  ON user_profiles (home_city_id, id)
  WHERE directory_visible = true AND home_city_id IS NOT NULL;
