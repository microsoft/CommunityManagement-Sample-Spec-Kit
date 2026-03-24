-- Migration: 008_home_city_geography_fk
-- Fix: change user_profiles.home_city_id FK from cities(id) to geography(id).
-- The directory service (spec 009) joins geography for display_name_city / display_name_country
-- and for continent/country filters, so home_city_id must reference geography, not cities.
--
-- Note: If any existing home_city_id values do not match a geography.id, this migration
-- will fail. In that case, first NULL out orphaned references:
--   UPDATE user_profiles SET home_city_id = NULL
--     WHERE home_city_id NOT IN (SELECT id FROM geography);

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_home_city_id_fkey;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_home_city_id_fkey
  FOREIGN KEY (home_city_id) REFERENCES geography(id);
