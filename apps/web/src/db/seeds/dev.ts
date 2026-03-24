/**
 * Dev seed: populates the database with sample data for local development.
 * Creates 10 users, geography, venues, 10 events, 10 teacher profiles,
 * community profiles (directory-visible), and social links.
 *
 * Run via:  npm run db:seed:dev -w @acroyoga/web
 * Or auto-seeded on first dev request via /api/dev/mock-user/seed?full=true
 */
import { db } from "@/lib/db/client";
import { SAMPLE_USERS } from "@/lib/auth/mock-users";
import { seedMockUsers } from "@/lib/auth/mock-seed";
import type { DbClient } from "@/lib/db/client";

/* ------------------------------------------------------------------ */
/*  5 extra users (IDs 006–010) to complement mock-users.ts 001–005   */
/* ------------------------------------------------------------------ */
const EXTRA_USERS = [
  { id: "00000000-0000-4000-a000-000000000006", email: "frank@example.com", name: "Frank Teacher" },
  { id: "00000000-0000-4000-a000-000000000007", email: "grace@example.com", name: "Grace Yogi" },
  { id: "00000000-0000-4000-a000-000000000008", email: "hiro@example.com",  name: "Hiro Tanaka" },
  { id: "00000000-0000-4000-a000-000000000009", email: "isla@example.com",  name: "Isla Santos" },
  { id: "00000000-0000-4000-a000-000000000010", email: "javier@example.com", name: "Javier Cruz" },
];

const ALL_USER_IDS = [
  ...SAMPLE_USERS.map((u) => u.id),
  ...EXTRA_USERS.map((u) => u.id),
];

/* ------------------------------------------------------------------ */
/*  Geography: countries + cities                                      */
/* ------------------------------------------------------------------ */
const COUNTRIES = [
  { name: "United Kingdom", code: "GB", continent: "EU" },
  { name: "France",         code: "FR", continent: "EU" },
  { name: "United States",  code: "US", continent: "NA" },
  { name: "Thailand",       code: "TH", continent: "AS" },
];

interface CityDef {
  name: string; slug: string; countryCode: string;
  lat: number; lon: number; timezone: string;
}

const CITIES: CityDef[] = [
  { name: "Bristol",       slug: "bristol",       countryCode: "GB", lat: 51.4545, lon: -2.5879,   timezone: "Europe/London" },
  { name: "London",        slug: "london",        countryCode: "GB", lat: 51.5074, lon: -0.1278,   timezone: "Europe/London" },
  { name: "Paris",         slug: "paris",         countryCode: "FR", lat: 48.8566, lon: 2.3522,    timezone: "Europe/Paris" },
  { name: "San Francisco", slug: "san-francisco", countryCode: "US", lat: 37.7749, lon: -122.4194, timezone: "America/Los_Angeles" },
  { name: "Bangkok",       slug: "bangkok",       countryCode: "TH", lat: 13.7563, lon: 100.5018,  timezone: "Asia/Bangkok" },
];

/* ------------------------------------------------------------------ */
/*  Venues (one per city)                                              */
/* ------------------------------------------------------------------ */
const VENUES = [
  { name: "Bristol AcroYoga Studio",  address: "42 Stokes Croft, Bristol BS1 3QD",            citySlug: "bristol" },
  { name: "Southbank Centre",         address: "Belvedere Rd, London SE1 8XX",                 citySlug: "london" },
  { name: "Espace Cirque Paris",      address: "12 Rue de la Roquette, 75011 Paris",           citySlug: "paris" },
  { name: "Mission Dolores Park",     address: "Dolores St & 19th St, San Francisco, CA 94114",citySlug: "san-francisco" },
  { name: "Lumpini Park Studio",      address: "Thanon Rama IV, Pathum Wan, Bangkok 10330",    citySlug: "bangkok" },
];

/* ------------------------------------------------------------------ */
/*  Events — 10 events across categories and skill levels              */
/* ------------------------------------------------------------------ */
type EventCategory = "jam" | "workshop" | "class" | "festival" | "social" | "retreat" | "teacher_training";
type SkillLevel = "beginner" | "intermediate" | "advanced" | "all_levels";

interface EventDef {
  title: string; description: string;
  category: EventCategory; skillLevel: SkillLevel;
  cost: number; currency: string; capacity: number;
  venueIdx: number; creatorIdx: number;
  daysFromNow: number; durationHours: number;
}

const EVENTS: EventDef[] = [
  { title: "Sunday Flow Jam",                 description: "Open jam for all levels. Bring a mat and a smile!",                                  category: "jam",              skillLevel: "all_levels",   cost: 5,    currency: "GBP", capacity: 40,  venueIdx: 0, creatorIdx: 3, daysFromNow: 3,  durationHours: 3 },
  { title: "Hand-to-Hand Foundations",         description: "Learn the fundamentals of hand-to-hand balancing with a focus on safety and technique.", category: "workshop",         skillLevel: "intermediate", cost: 25,   currency: "GBP", capacity: 20,  venueIdx: 0, creatorIdx: 3, daysFromNow: 7,  durationHours: 2 },
  { title: "Beginner AcroYoga Intro",          description: "Your first AcroYoga class — we cover L-basing, star, and throne.",                   category: "class",            skillLevel: "beginner",     cost: 15,   currency: "GBP", capacity: 30,  venueIdx: 1, creatorIdx: 0, daysFromNow: 5,  durationHours: 1.5 },
  { title: "London Washing Machines Intensive", description: "Intensive workshop on flows and washing machines. Partners rotate each round.",       category: "workshop",         skillLevel: "advanced",     cost: 35,   currency: "GBP", capacity: 16,  venueIdx: 1, creatorIdx: 0, daysFromNow: 10, durationHours: 4 },
  { title: "Paris Acro Festival 2026",          description: "3-day festival featuring 15+ teachers, jams, workshops and performances.",            category: "festival",         skillLevel: "all_levels",   cost: 120,  currency: "EUR", capacity: 200, venueIdx: 2, creatorIdx: 5, daysFromNow: 30, durationHours: 72 },
  { title: "SF Sunset Social",                 description: "Casual meet-up at the park. Bring snacks, acro optional, community always.",          category: "social",           skillLevel: "all_levels",   cost: 0,    currency: "USD", capacity: 60,  venueIdx: 3, creatorIdx: 6, daysFromNow: 2,  durationHours: 3 },
  { title: "Therapeutic Flying Workshop",       description: "Slow, meditative therapeutic flying. Focus on breathing, alignment, trust.",          category: "workshop",         skillLevel: "beginner",     cost: 30,   currency: "USD", capacity: 24,  venueIdx: 3, creatorIdx: 6, daysFromNow: 14, durationHours: 2.5 },
  { title: "Bangkok Acro Retreat",              description: "Week-long retreat with daily practice, Thai massage integration and temple visits.",   category: "retreat",          skillLevel: "intermediate", cost: 450,  currency: "THB", capacity: 25,  venueIdx: 4, creatorIdx: 7, daysFromNow: 45, durationHours: 168 },
  { title: "Icarian Games Masterclass",         description: "Advanced icarian techniques — pops, twists, full sequences. Spotters provided.",      category: "teacher_training", skillLevel: "advanced",     cost: 50,   currency: "GBP", capacity: 12,  venueIdx: 0, creatorIdx: 3, daysFromNow: 21, durationHours: 5 },
  { title: "Acro Partner Dance Night",          description: "Music, movement and acro-dance fusion. Come with or without a partner.",              category: "social",           skillLevel: "all_levels",   cost: 10,   currency: "GBP", capacity: 50,  venueIdx: 1, creatorIdx: 0, daysFromNow: 12, durationHours: 3 },
];

/* ------------------------------------------------------------------ */
/*  Teacher profiles — 10 teachers across the user pool                */
/* ------------------------------------------------------------------ */
type Specialty = "washing_machines" | "hand_to_hand" | "therapeutic" | "whips_and_pops" |
  "icarian" | "standing" | "l_basing" | "partner_acrobatics" | "dance_acro" | "flow" | "coaching" | "choreography";

interface TeacherDef {
  userIdx: number; bio: string;
  specialties: Specialty[];
  badgeStatus: "pending" | "verified" | "expired";
  rating: number | null; reviewCount: number;
  certName?: string; certBody?: string;
}

const TEACHERS: TeacherDef[] = [
  { userIdx: 0, bio: "Global admin and veteran acroyogi with 12 years of teaching experience. Focuses on safe progressions.",                          specialties: ["hand_to_hand", "coaching", "standing"],              badgeStatus: "verified", rating: 4.8,  reviewCount: 42, certName: "AcroYoga International Level 2", certBody: "AcroYoga International" },
  { userIdx: 3, bio: "Bristol-based creator and instructor specialising in washing machines and dynamic flows.",                                         specialties: ["washing_machines", "flow", "partner_acrobatics"],     badgeStatus: "verified", rating: 4.6,  reviewCount: 28, certName: "YogaAlliance RYT-200",         certBody: "Yoga Alliance" },
  { userIdx: 5, bio: "French acrobat and teacher, co-founder of Paris Acro Festival. L-basing maestro.",                                                specialties: ["l_basing", "icarian", "choreography"],               badgeStatus: "verified", rating: 4.9,  reviewCount: 67, certName: "Circus Arts Diploma",           certBody: "ENACR Paris" },
  { userIdx: 6, bio: "San Francisco-based therapeutic flyer and community organiser. Passionate about inclusive practice.",                              specialties: ["therapeutic", "flow", "coaching"],                    badgeStatus: "verified", rating: 4.7,  reviewCount: 35 },
  { userIdx: 7, bio: "Thai massage practitioner turned acroyogi. Runs retreats across Southeast Asia blending Thai bodywork with acro.",                 specialties: ["therapeutic", "partner_acrobatics", "standing"],      badgeStatus: "verified", rating: 4.5,  reviewCount: 19, certName: "Thai Massage Level 3",          certBody: "Wat Pho Traditional Medical School" },
  { userIdx: 8, bio: "Whips, pops and icarian specialist from Osaka. Precision and timing are everything.",                                             specialties: ["whips_and_pops", "icarian", "hand_to_hand"],          badgeStatus: "verified", rating: 4.85, reviewCount: 51, certName: "Japan Gymnastics Coach License", certBody: "Japan Gymnastics Association" },
  { userIdx: 9, bio: "Dance-acro fusion artist from Lisbon. Blends contemporary dance with acrobatic movement.",                                        specialties: ["dance_acro", "choreography", "flow"],                badgeStatus: "pending",  rating: null, reviewCount: 0 },
  { userIdx: 1, bio: "UK country admin who also teaches intermediate standing acro and L-basing on weekends.",                                          specialties: ["standing", "l_basing"],                              badgeStatus: "verified", rating: 4.3,  reviewCount: 14 },
  { userIdx: 2, bio: "Bristol city admin and assistant coach. Focuses on spotting fundamentals and beginner progressions.",                              specialties: ["coaching", "l_basing", "therapeutic"],               badgeStatus: "pending",  rating: null, reviewCount: 0 },
  { userIdx: 4, bio: "Community member exploring teaching. New to instruction but experienced practitioner with 5 years of jamming.",                    specialties: ["flow", "partner_acrobatics"],                        badgeStatus: "pending",  rating: null, reviewCount: 0 },
];

/* ------------------------------------------------------------------ */
/*  Community profiles — directory-visible user profiles                */
/* ------------------------------------------------------------------ */
type AcroRole = "base" | "flyer" | "hybrid";

interface ProfileDef {
  userIdx: number;
  displayName: string;
  bio: string;
  role: AcroRole;
  citySlug: string;
  directoryVisible: boolean;
}

const PROFILES: ProfileDef[] = [
  { userIdx: 0, displayName: "Alice Global",    bio: "Global admin and veteran acroyogi. 12 years of practice and teaching.",                role: "base",   citySlug: "bristol",       directoryVisible: true },
  { userIdx: 1, displayName: "Bob UK",          bio: "Country admin for the UK. Loves weekend acro jams and handstands.",                    role: "base",   citySlug: "london",        directoryVisible: true },
  { userIdx: 2, displayName: "Charlie Bristol",  bio: "Bristol city admin and spotting specialist. Welcome all newcomers!",                   role: "hybrid", citySlug: "bristol",       directoryVisible: true },
  { userIdx: 3, displayName: "Diana Creator",    bio: "Event creator and flow enthusiast based in Bristol. Washing machines are life.",       role: "flyer",  citySlug: "bristol",       directoryVisible: true },
  { userIdx: 4, displayName: "Eve Member",       bio: "Regular community member who loves Sunday jams and partner acrobatics.",               role: "flyer",  citySlug: "london",        directoryVisible: true },
  { userIdx: 5, displayName: "Frank Teacher",    bio: "French acrobat and L-basing maestro. Co-founder of Paris Acro Festival.",             role: "base",   citySlug: "paris",         directoryVisible: true },
  { userIdx: 6, displayName: "Grace Yogi",       bio: "San Francisco therapeutic flyer and community organiser. Inclusivity first!",         role: "flyer",  citySlug: "san-francisco", directoryVisible: true },
  { userIdx: 7, displayName: "Hiro Tanaka",      bio: "Thai massage meets acro. Running retreats across Southeast Asia.",                    role: "base",   citySlug: "bangkok",       directoryVisible: true },
  { userIdx: 8, displayName: "Isla Santos",      bio: "Dance-acro fusion artist from Lisbon. Blending contemporary dance with movement.",    role: "hybrid", citySlug: "paris",         directoryVisible: true },
  { userIdx: 9, displayName: "Javier Cruz",      bio: "New teacher and experienced practitioner. 5 years of jamming, ready to share.",       role: "hybrid", citySlug: "san-francisco", directoryVisible: false },
];

/* ------------------------------------------------------------------ */
/*  Social links — sample links for directory profiles                  */
/* ------------------------------------------------------------------ */
type SocialPlatform = "instagram" | "youtube" | "facebook" | "website" | "tiktok" | "twitter_x" | "linkedin" | "threads";

interface SocialDef {
  userIdx: number;
  platform: SocialPlatform;
  url: string;
}

const SOCIAL_LINKS: SocialDef[] = [
  { userIdx: 0, platform: "instagram",  url: "https://instagram.com/alice_acro" },
  { userIdx: 0, platform: "youtube",    url: "https://youtube.com/@aliceacro" },
  { userIdx: 0, platform: "website",    url: "https://aliceacro.com" },
  { userIdx: 1, platform: "instagram",  url: "https://instagram.com/bob_uk_acro" },
  { userIdx: 2, platform: "instagram",  url: "https://instagram.com/charlie_bristol" },
  { userIdx: 2, platform: "facebook",   url: "https://facebook.com/charlie.bristol.acro" },
  { userIdx: 3, platform: "instagram",  url: "https://instagram.com/diana_flows" },
  { userIdx: 3, platform: "tiktok",     url: "https://tiktok.com/@diana_flows" },
  { userIdx: 3, platform: "youtube",    url: "https://youtube.com/@dianaflows" },
  { userIdx: 4, platform: "instagram",  url: "https://instagram.com/eve_acro" },
  { userIdx: 5, platform: "instagram",  url: "https://instagram.com/frank_acro_paris" },
  { userIdx: 5, platform: "website",    url: "https://parisacrofestival.com" },
  { userIdx: 5, platform: "youtube",    url: "https://youtube.com/@frankteacher" },
  { userIdx: 5, platform: "linkedin",   url: "https://linkedin.com/in/frank-teacher" },
  { userIdx: 6, platform: "instagram",  url: "https://instagram.com/grace_yogi_sf" },
  { userIdx: 6, platform: "twitter_x",  url: "https://x.com/graceyogisf" },
  { userIdx: 7, platform: "instagram",  url: "https://instagram.com/hiro_acro_bkk" },
  { userIdx: 7, platform: "website",    url: "https://hiroacroretreat.com" },
  { userIdx: 8, platform: "instagram",  url: "https://instagram.com/isla_danceacro" },
  { userIdx: 8, platform: "threads",    url: "https://threads.net/@isla_danceacro" },
];

/* ================================================================== */
/*  Main seed function                                                 */
/* ================================================================== */
export async function seedDevData(client?: DbClient): Promise<string[]> {
  const d = client ?? db();
  const log: string[] = [];

  // 1. Seed core mock users + permissions
  await seedMockUsers(d);
  log.push("Seeded 5 mock users with permissions");

  // 2. Insert extra users
  for (const u of EXTRA_USERS) {
    await d.query(
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name",
      [u.id, u.email, u.name],
    );
  }
  log.push(`Seeded ${EXTRA_USERS.length} additional users (total 10)`);

  // 3. Countries + cities
  const countryIds: Record<string, string> = {};
  for (const c of COUNTRIES) {
    const res = await d.query<{ id: string }>(
      "INSERT INTO countries (name, code, continent_code) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      [c.name, c.code, c.continent],
    );
    countryIds[c.code] = res.rows[0].id;
  }
  log.push(`Seeded ${COUNTRIES.length} countries`);

  const cityIds: Record<string, string> = {};
  for (const city of CITIES) {
    const res = await d.query<{ id: string }>(
      `INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [city.name, city.slug, countryIds[city.countryCode], city.lat, city.lon, city.timezone],
    );
    cityIds[city.slug] = res.rows[0].id;
  }
  log.push(`Seeded ${CITIES.length} cities`);

  // 4. Venues
  const venueIds: string[] = [];
  for (const v of VENUES) {
    const cityId = cityIds[v.citySlug];
    const createdBy = ALL_USER_IDS[0]; // Alice creates venues
    const res = await d.query<{ id: string }>(
      `INSERT INTO venues (name, address, city_id, latitude, longitude, created_by)
       VALUES ($1, $2, $3,
               (SELECT latitude FROM cities WHERE id = $3),
               (SELECT longitude FROM cities WHERE id = $3),
               $4)
       ON CONFLICT DO NOTHING RETURNING id`,
      [v.name, v.address, cityId, createdBy],
    );
    if (res.rows.length > 0) {
      venueIds.push(res.rows[0].id);
    } else {
      // Already exists — look it up
      const existing = await d.query<{ id: string }>(
        "SELECT id FROM venues WHERE name = $1 AND city_id = $2",
        [v.name, cityId],
      );
      venueIds.push(existing.rows[0].id);
    }
  }
  log.push(`Seeded ${VENUES.length} venues`);

  // 5. Events
  let eventsCreated = 0;
  for (const ev of EVENTS) {
    const now = new Date();
    const start = new Date(now.getTime() + ev.daysFromNow * 86400000);
    start.setHours(10, 0, 0, 0); // normalise to 10 AM
    const end = new Date(start.getTime() + ev.durationHours * 3600000);

    const creatorId = ALL_USER_IDS[ev.creatorIdx];
    const venueId = venueIds[ev.venueIdx];

    await d.query(
      `INSERT INTO events (title, description, start_datetime, end_datetime, venue_id,
                           category, skill_level, cost, currency, capacity, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT DO NOTHING`,
      [ev.title, ev.description, start.toISOString(), end.toISOString(), venueId,
       ev.category, ev.skillLevel, ev.cost, ev.currency, ev.capacity, creatorId],
    );
    eventsCreated++;
  }
  log.push(`Seeded ${eventsCreated} events`);

  // 6. Teacher profiles + certifications
  let teachersCreated = 0;
  for (const t of TEACHERS) {
    const userId = ALL_USER_IDS[t.userIdx];
    const res = await d.query<{ id: string }>(
      `INSERT INTO teacher_profiles (user_id, bio, specialties, badge_status, aggregate_rating, review_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio RETURNING id`,
      [userId, t.bio, t.specialties, t.badgeStatus, t.rating, t.reviewCount],
    );
    const profileId = res.rows[0].id;
    teachersCreated++;

    if (t.certName && t.certBody) {
      await d.query(
        `INSERT INTO certifications (teacher_profile_id, name, issuing_body, status)
         VALUES ($1, $2, $3, 'verified')
         ON CONFLICT DO NOTHING`,
        [profileId, t.certName, t.certBody],
      );
    }
  }
  log.push(`Seeded ${teachersCreated} teacher profiles`);

  // 7. Community profiles (user_profiles with directory_visible)
  let profilesCreated = 0;
  for (const p of PROFILES) {
    const userId = ALL_USER_IDS[p.userIdx];
    const cityId = cityIds[p.citySlug] ?? null;
    await d.query(
      `INSERT INTO user_profiles (user_id, display_name, bio, default_role, home_city_id, directory_visible)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         bio = EXCLUDED.bio,
         default_role = EXCLUDED.default_role,
         home_city_id = EXCLUDED.home_city_id,
         directory_visible = EXCLUDED.directory_visible`,
      [userId, p.displayName, p.bio, p.role, cityId, p.directoryVisible],
    );
    profilesCreated++;
  }
  log.push(`Seeded ${profilesCreated} community profiles (${PROFILES.filter((p) => p.directoryVisible).length} directory-visible)`);

  // 8. Social links
  let linksCreated = 0;
  for (const sl of SOCIAL_LINKS) {
    const userId = ALL_USER_IDS[sl.userIdx];
    await d.query(
      `INSERT INTO social_links (user_id, platform, url, visibility)
       VALUES ($1, $2, $3, 'everyone')
       ON CONFLICT (user_id, platform) DO UPDATE SET url = EXCLUDED.url`,
      [userId, sl.platform, sl.url],
    );
    linksCreated++;
  }
  log.push(`Seeded ${linksCreated} social links`);

  return log;
}

/* ------------------------------------------------------------------ */
/*  CLI entrypoint: npm run db:seed:dev                                */
/* ------------------------------------------------------------------ */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  seedDevData()
    .then((log) => {
      console.log("Dev seed complete:");
      log.forEach((l) => console.log(`  ✓ ${l}`));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Dev seed failed:", err);
      process.exit(1);
    });
}
