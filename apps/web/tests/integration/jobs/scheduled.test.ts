import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import { clearQueue, MemoryJobQueue, setTestQueue } from "@/lib/jobs/queue";
import {
  reviewReminderJob,
  certExpiryJob,
  waitlistCleanupJob,
} from "@/lib/jobs/scheduled";

let pg: PGlite;
let testQueue: MemoryJobQueue;

describe("Scheduled Jobs", () => {
  let userId: string;
  let teacherUserId: string;

  beforeEach(async () => {
    pg = await createTestDb();
    setTestDb(pg);
    testQueue = new MemoryJobQueue();
    setTestQueue(testQueue);

    // Seed geography (country → city)
    await pg.query(
      `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
       VALUES ('bristol', 'uk', 'europe', 'Bristol', 'United Kingdom', 'Europe')
       ON CONFLICT (city) DO NOTHING`,
    );

    // Seed a country and city for venues
    const countryRes = await pg.query<{ id: string }>(
      `INSERT INTO countries (name, code, continent_code)
       VALUES ('United Kingdom', 'UK', 'EU')
       RETURNING id`,
    );
    const countryId = countryRes.rows[0].id;

    await pg.query(
      `INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone)
       VALUES ('Bristol', 'bristol', $1, 51.45, -2.58, 'Europe/London')
       ON CONFLICT (slug) DO NOTHING`,
      [countryId],
    );

    // Seed users
    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["attendee@test.com", "Attendee"],
    );
    userId = userRes.rows[0].id;

    const teacherRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["teacher@test.com", "Teacher"],
    );
    teacherUserId = teacherRes.rows[0].id;
  });

  afterEach(() => {
    clearTestDb();
    clearQueue();
  });

  describe("reviewReminderJob", () => {
    it("identifies events in past week without reviews and sends reminders", async () => {
      // Create a venue
      const venueRes = await pg.query<{ id: string }>(
        `INSERT INTO venues (name, address, city_id, latitude, longitude, created_by)
         VALUES ('Test Venue', '123 St', (SELECT id FROM cities LIMIT 1), 51.45, -2.58, $1) RETURNING id`,
        [userId],
      );
      const venueId = venueRes.rows[0].id;

      // Create an event that ended 3 days ago
      const eventRes = await pg.query<{ id: string }>(
        `INSERT INTO events (title, start_datetime, end_datetime, venue_id, category, skill_level, capacity, cost, currency, created_by, status)
         VALUES ('Past Jam', now() - interval '3 days 2 hours', now() - interval '3 days', $1, 'jam', 'all_levels', 20, 0, 'GBP', $2, 'published')
         RETURNING id`,
        [venueId, teacherUserId],
      );
      const eventId = eventRes.rows[0].id;

      // Create a confirmed RSVP (no review)
      await pg.query(
        `INSERT INTO rsvps (event_id, user_id, role, status)
         VALUES ($1, $2, 'base', 'confirmed')`,
        [eventId, userId],
      );

      const count = await reviewReminderJob();
      expect(count).toBe(1);
    });

    it("does not send reminders for events with existing reviews", async () => {
      // Create a venue
      const venueRes = await pg.query<{ id: string }>(
        `INSERT INTO venues (name, address, city_id, latitude, longitude, created_by)
         VALUES ('Reviewed Venue', '456 St', (SELECT id FROM cities LIMIT 1), 51.45, -2.58, $1) RETURNING id`,
        [userId],
      );
      const venueId = venueRes.rows[0].id;

      // Create event that ended 2 days ago
      const eventRes = await pg.query<{ id: string }>(
        `INSERT INTO events (title, start_datetime, end_datetime, venue_id, category, skill_level, capacity, cost, currency, created_by, status)
         VALUES ('Reviewed Jam', now() - interval '2 days 2 hours', now() - interval '2 days', $1, 'jam', 'all_levels', 20, 0, 'GBP', $2, 'published')
         RETURNING id`,
        [venueId, teacherUserId],
      );
      const eventId = eventRes.rows[0].id;

      // Create a confirmed RSVP
      await pg.query(
        `INSERT INTO rsvps (event_id, user_id, role, status)
         VALUES ($1, $2, 'base', 'confirmed')`,
        [eventId, userId],
      );

      // Create a teacher profile and review
      const profileRes = await pg.query<{ id: string }>(
        `INSERT INTO teacher_profiles (user_id, bio, specialties)
         VALUES ($1, 'Teacher bio', ARRAY['acroyoga'])
         RETURNING id`,
        [teacherUserId],
      );

      await pg.query(
        `INSERT INTO reviews (event_id, teacher_profile_id, reviewer_id, rating, text, review_window_closes_at)
         VALUES ($1, $2, $3, 5, 'Great class!', now() + interval '30 days')`,
        [eventId, profileRes.rows[0].id, userId],
      );

      const count = await reviewReminderJob();
      expect(count).toBe(0);
    });
  });

  describe("certExpiryJob", () => {
    it("identifies certifications expiring within 30 days", async () => {
      // Create teacher profile
      const profileRes = await pg.query<{ id: string }>(
        `INSERT INTO teacher_profiles (user_id, bio, specialties)
         VALUES ($1, 'Teacher bio', ARRAY['acroyoga'])
         RETURNING id`,
        [teacherUserId],
      );

      // Create a cert expiring in 15 days
      await pg.query(
        `INSERT INTO certifications (teacher_profile_id, name, issuing_body, status, expiry_date)
         VALUES ($1, 'AcroYoga Level 1', 'AcroYoga International', 'verified', CURRENT_DATE + interval '15 days')`,
        [profileRes.rows[0].id],
      );

      const count = await certExpiryJob();
      expect(count).toBe(1);
    });

    it("does not alert for certifications not expiring soon", async () => {
      // Create teacher profile
      const profileRes = await pg.query<{ id: string }>(
        `INSERT INTO teacher_profiles (user_id, bio, specialties)
         VALUES ($1, 'Teacher bio', ARRAY['acroyoga'])
         RETURNING id`,
        [teacherUserId],
      );

      // Cert expiring in 60 days (outside 30-day window)
      await pg.query(
        `INSERT INTO certifications (teacher_profile_id, name, issuing_body, status, expiry_date)
         VALUES ($1, 'AcroYoga Level 2', 'AcroYoga International', 'verified', CURRENT_DATE + interval '60 days')`,
        [profileRes.rows[0].id],
      );

      const count = await certExpiryJob();
      expect(count).toBe(0);
    });
  });

  describe("waitlistCleanupJob", () => {
    it("removes stale waitlist entries for past events", async () => {
      // Create a venue
      const venueRes = await pg.query<{ id: string }>(
        `INSERT INTO venues (name, address, city_id, latitude, longitude, created_by)
         VALUES ('WL Venue', '789 St', (SELECT id FROM cities LIMIT 1), 51.45, -2.58, $1) RETURNING id`,
        [userId],
      );
      const venueId = venueRes.rows[0].id;

      // Create an event that ended yesterday
      const eventRes = await pg.query<{ id: string }>(
        `INSERT INTO events (title, start_datetime, end_datetime, venue_id, category, skill_level, capacity, cost, currency, created_by, status)
         VALUES ('Past Event', now() - interval '2 days', now() - interval '1 day', $1, 'jam', 'all_levels', 2, 0, 'GBP', $2, 'published')
         RETURNING id`,
        [venueId, teacherUserId],
      );

      // Add to waitlist (not promoted, not expired)
      await pg.query(
        `INSERT INTO waitlist (event_id, user_id, role, position)
         VALUES ($1, $2, 'base', 1)`,
        [eventRes.rows[0].id, userId],
      );

      const count = await waitlistCleanupJob();
      expect(count).toBe(1);

      // Verify waitlist entry was expired
      const result = await pg.query<{ expired_at: string | null }>(
        "SELECT expired_at FROM waitlist WHERE user_id = $1",
        [userId],
      );
      expect(result.rows[0].expired_at).not.toBeNull();
    });

    it("does not expire active waitlist entries for future events", async () => {
      // Create a venue
      const venueRes = await pg.query<{ id: string }>(
        `INSERT INTO venues (name, address, city_id, latitude, longitude, created_by)
         VALUES ('Future Venue', '101 St', (SELECT id FROM cities LIMIT 1), 51.45, -2.58, $1) RETURNING id`,
        [userId],
      );
      const venueId = venueRes.rows[0].id;

      // Create a future event
      const eventRes = await pg.query<{ id: string }>(
        `INSERT INTO events (title, start_datetime, end_datetime, venue_id, category, skill_level, capacity, cost, currency, created_by, status)
         VALUES ('Future Event', now() + interval '1 day', now() + interval '2 days', $1, 'jam', 'all_levels', 2, 0, 'GBP', $2, 'published')
         RETURNING id`,
        [venueId, teacherUserId],
      );

      // Add to waitlist
      await pg.query(
        `INSERT INTO waitlist (event_id, user_id, role, position)
         VALUES ($1, $2, 'base', 1)`,
        [eventRes.rows[0].id, userId],
      );

      const count = await waitlistCleanupJob();
      expect(count).toBe(0);
    });
  });
});
