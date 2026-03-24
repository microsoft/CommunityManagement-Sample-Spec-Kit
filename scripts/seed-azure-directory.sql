-- Seed Azure PostgreSQL with directory data (community profiles + social links)
-- Run with: psql $DATABASE_URL -f scripts/seed-azure-directory.sql

BEGIN;

-- 1. Ensure all 10 users exist
INSERT INTO users (id, email, name) VALUES
  ('00000000-0000-4000-a000-000000000001', 'alice@example.com',   'Alice Global'),
  ('00000000-0000-4000-a000-000000000002', 'bob@example.com',     'Bob UK'),
  ('00000000-0000-4000-a000-000000000003', 'charlie@example.com', 'Charlie Bristol'),
  ('00000000-0000-4000-a000-000000000004', 'diana@example.com',   'Diana Creator'),
  ('00000000-0000-4000-a000-000000000005', 'eve@example.com',     'Eve Member'),
  ('00000000-0000-4000-a000-000000000006', 'frank@example.com',   'Frank Teacher'),
  ('00000000-0000-4000-a000-000000000007', 'grace@example.com',   'Grace Yogi'),
  ('00000000-0000-4000-a000-000000000008', 'hiro@example.com',    'Hiro Tanaka'),
  ('00000000-0000-4000-a000-000000000009', 'isla@example.com',    'Isla Santos'),
  ('00000000-0000-4000-a000-000000000010', 'javier@example.com',  'Javier Cruz')
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure countries exist
INSERT INTO countries (name, code, continent) VALUES
  ('United Kingdom', 'GB', 'EU'),
  ('France',         'FR', 'EU'),
  ('United States',  'US', 'NA'),
  ('Thailand',       'TH', 'AS')
ON CONFLICT (code) DO NOTHING;

-- 3. Ensure cities exist
INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES
  ('Bristol',       'bristol',       (SELECT id FROM countries WHERE code = 'GB'), 51.454500, -2.587900, 'Europe/London'),
  ('London',        'london',        (SELECT id FROM countries WHERE code = 'GB'), 51.507400, -0.127800, 'Europe/London'),
  ('Paris',         'paris',         (SELECT id FROM countries WHERE code = 'FR'), 48.856600,  2.352200, 'Europe/Paris'),
  ('San Francisco', 'san-francisco', (SELECT id FROM countries WHERE code = 'US'), 37.774900, -122.419400, 'America/Los_Angeles'),
  ('Bangkok',       'bangkok',       (SELECT id FROM countries WHERE code = 'TH'), 13.756300, 100.501800, 'Asia/Bangkok')
ON CONFLICT (slug) DO NOTHING;

-- 4. Insert community profiles (user_profiles with directory_visible)
INSERT INTO user_profiles (user_id, display_name, bio, default_role, home_city_id, directory_visible) VALUES
  ('00000000-0000-4000-a000-000000000001', 'Alice Global',   'Global admin and veteran acroyogi. 12 years of practice and teaching.',              'base',   (SELECT id FROM cities WHERE slug = 'bristol'),       true),
  ('00000000-0000-4000-a000-000000000002', 'Bob UK',         'Country admin for the UK. Loves weekend acro jams and handstands.',                  'base',   (SELECT id FROM cities WHERE slug = 'london'),        true),
  ('00000000-0000-4000-a000-000000000003', 'Charlie Bristol', 'Bristol city admin and spotting specialist. Welcome all newcomers!',                 'hybrid', (SELECT id FROM cities WHERE slug = 'bristol'),       true),
  ('00000000-0000-4000-a000-000000000004', 'Diana Creator',  'Event creator and flow enthusiast based in Bristol. Washing machines are life.',     'flyer',  (SELECT id FROM cities WHERE slug = 'bristol'),       true),
  ('00000000-0000-4000-a000-000000000005', 'Eve Member',     'Regular community member who loves Sunday jams and partner acrobatics.',             'flyer',  (SELECT id FROM cities WHERE slug = 'london'),        true),
  ('00000000-0000-4000-a000-000000000006', 'Frank Teacher',  'French acrobat and L-basing maestro. Co-founder of Paris Acro Festival.',           'base',   (SELECT id FROM cities WHERE slug = 'paris'),         true),
  ('00000000-0000-4000-a000-000000000007', 'Grace Yogi',     'San Francisco therapeutic flyer and community organiser. Inclusivity first!',       'flyer',  (SELECT id FROM cities WHERE slug = 'san-francisco'), true),
  ('00000000-0000-4000-a000-000000000008', 'Hiro Tanaka',    'Thai massage meets acro. Running retreats across Southeast Asia.',                  'base',   (SELECT id FROM cities WHERE slug = 'bangkok'),       true),
  ('00000000-0000-4000-a000-000000000009', 'Isla Santos',    'Dance-acro fusion artist from Lisbon. Blending contemporary dance with movement.',  'hybrid', (SELECT id FROM cities WHERE slug = 'paris'),         true),
  ('00000000-0000-4000-a000-000000000010', 'Javier Cruz',    'New teacher and experienced practitioner. 5 years of jamming, ready to share.',     'hybrid', (SELECT id FROM cities WHERE slug = 'san-francisco'), false)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  default_role = EXCLUDED.default_role,
  home_city_id = EXCLUDED.home_city_id,
  directory_visible = EXCLUDED.directory_visible;

-- 5. Insert social links
INSERT INTO social_links (user_id, platform, url) VALUES
  ('00000000-0000-4000-a000-000000000001', 'instagram', 'https://instagram.com/alice_acro'),
  ('00000000-0000-4000-a000-000000000001', 'youtube',   'https://youtube.com/@aliceacro'),
  ('00000000-0000-4000-a000-000000000001', 'website',   'https://aliceacro.com'),
  ('00000000-0000-4000-a000-000000000002', 'instagram', 'https://instagram.com/bob_uk_acro'),
  ('00000000-0000-4000-a000-000000000003', 'instagram', 'https://instagram.com/charlie_bristol'),
  ('00000000-0000-4000-a000-000000000003', 'facebook',  'https://facebook.com/charlie.bristol.acro'),
  ('00000000-0000-4000-a000-000000000004', 'instagram', 'https://instagram.com/diana_flows'),
  ('00000000-0000-4000-a000-000000000004', 'tiktok',    'https://tiktok.com/@diana_flows'),
  ('00000000-0000-4000-a000-000000000004', 'youtube',   'https://youtube.com/@dianaflows'),
  ('00000000-0000-4000-a000-000000000005', 'instagram', 'https://instagram.com/eve_acro'),
  ('00000000-0000-4000-a000-000000000006', 'instagram', 'https://instagram.com/frank_acro_paris'),
  ('00000000-0000-4000-a000-000000000006', 'website',   'https://parisacrofestival.com'),
  ('00000000-0000-4000-a000-000000000006', 'youtube',   'https://youtube.com/@frankteacher'),
  ('00000000-0000-4000-a000-000000000006', 'linkedin',  'https://linkedin.com/in/frank-teacher'),
  ('00000000-0000-4000-a000-000000000007', 'instagram', 'https://instagram.com/grace_yogi_sf'),
  ('00000000-0000-4000-a000-000000000007', 'twitter_x', 'https://x.com/graceyogisf'),
  ('00000000-0000-4000-a000-000000000008', 'instagram', 'https://instagram.com/hiro_acro_bkk'),
  ('00000000-0000-4000-a000-000000000008', 'website',   'https://hiroacroretreat.com'),
  ('00000000-0000-4000-a000-000000000009', 'instagram', 'https://instagram.com/isla_danceacro'),
  ('00000000-0000-4000-a000-000000000009', 'threads',   'https://threads.net/@isla_danceacro')
ON CONFLICT (user_id, platform) DO UPDATE SET url = EXCLUDED.url;

COMMIT;
