import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  submitReview,
  listReviewsForTeacher,
  listReviewsForEvent,
  recalculateAggregate,
  hideReview,
  unhideReview,
} from "@/lib/teachers/reviews";
import fs from "fs";
import path from "path";

let db: PGlite;
let teacherUserId: string;
let reviewerUserId: string;
let adminId: string;
let profileId: string;
let eventId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

let eventCounter = 0;

async function createPastEvent(pglite: PGlite, creator: string, daysAgo: number): Promise<string> {
  eventCounter++;
  const slug = `city-${eventCounter}-${Math.random().toString(36).slice(2, 10)}`;
  const code = `C${eventCounter}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const country = await pglite.query<{ id: string }>(
    `INSERT INTO countries (name, code, continent_code) VALUES ('UK', $1, 'EU') RETURNING id`,
    [code],
  );
  const city = await pglite.query<{ id: string }>(
    `INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone)
     VALUES ('London', $1, $2, 51.5, -0.12, 'Europe/London') RETURNING id`,
    [slug, country.rows[0].id],
  );
  const venue = await pglite.query<{ id: string }>(
    `INSERT INTO venues (name, address, city_id, latitude, longitude, created_by)
     VALUES ('Venue', '1 St', $1, 51.5, -0.12, $2) RETURNING id`,
    [city.rows[0].id, creator],
  );

  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(start.getHours() - 3);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  const result = await pglite.query<{ id: string }>(
    `INSERT INTO events (title, start_datetime, end_datetime, venue_id, category, skill_level, capacity, created_by)
     VALUES ('Past Workshop', $1, $2, $3, 'workshop', 'all_levels', 20, $4) RETURNING id`,
    [start.toISOString(), end.toISOString(), venue.rows[0].id, creator],
  );
  return result.rows[0].id;
}

describe("Reviews", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const t = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('teacher@test.com', 'Teacher') RETURNING id",
    );
    teacherUserId = t.rows[0].id;

    const r = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('reviewer@test.com', 'Reviewer') RETURNING id",
    );
    reviewerUserId = r.rows[0].id;

    const a = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('admin@test.com', 'Admin') RETURNING id",
    );
    adminId = a.rows[0].id;

    const p = await db.query<{ id: string }>(
      `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
       VALUES ($1, '{}', 'verified') RETURNING id`,
      [teacherUserId],
    );
    profileId = p.rows[0].id;

    // Create event that ended 3 days ago (within 14-day window)
    eventId = await createPastEvent(db, teacherUserId, 3);

    // Assign teacher to event
    await db.query(
      `INSERT INTO event_teachers (event_id, teacher_profile_id, role) VALUES ($1, $2, 'lead')`,
      [eventId, profileId],
    );

    // Create confirmed RSVP for reviewer
    await db.query(
      `INSERT INTO rsvps (event_id, user_id, role, status) VALUES ($1, $2, 'base', 'confirmed')`,
      [eventId, reviewerUserId],
    );
  }, 30000);

  afterEach(async () => {
    clearTestDb();
    await db.close();
  }, 30000);

  describe("submitReview", () => {
    it("should submit a review with rating and text", async () => {
      const review = await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 5,
        text: "Great teacher!",
      });
      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.text).toBe("Great teacher!");
      expect(review.event_id).toBe(eventId);
      expect(review.teacher_profile_id).toBe(profileId);
    });

    it("should submit a review without text", async () => {
      const review = await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 4,
      });
      expect(review.text).toBeNull();
    });

    it("should update aggregate rating on teacher profile", async () => {
      await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 4,
      });

      const profile = await db.query<{ aggregate_rating: string; review_count: number }>(
        `SELECT aggregate_rating, review_count FROM teacher_profiles WHERE id = $1`,
        [profileId],
      );
      expect(parseFloat(profile.rows[0].aggregate_rating)).toBeCloseTo(4.0);
      expect(profile.rows[0].review_count).toBe(1);
    });

    it("should reject review from non-attendee", async () => {
      const other = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('other@test.com', 'Other') RETURNING id",
      );
      await expect(
        submitReview(eventId, other.rows[0].id, {
          teacherProfileId: profileId,
          rating: 3,
        }),
      ).rejects.toThrow("only review events you attended");
    });

    it("should reject review for unassigned teacher", async () => {
      // Create another teacher not assigned to the event
      const u = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('other-t@test.com', 'Other Teacher') RETURNING id",
      );
      const p = await db.query<{ id: string }>(
        `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
         VALUES ($1, '{}', 'verified') RETURNING id`,
        [u.rows[0].id],
      );

      await expect(
        submitReview(eventId, reviewerUserId, {
          teacherProfileId: p.rows[0].id,
          rating: 3,
        }),
      ).rejects.toThrow("not assigned to this event");
    });

    it("should reject review outside the 14-day window", async () => {
      // Create event that ended 20 days ago
      const oldEventId = await createPastEvent(db, teacherUserId, 20);
      await db.query(
        `INSERT INTO event_teachers (event_id, teacher_profile_id, role) VALUES ($1, $2, 'lead')`,
        [oldEventId, profileId],
      );
      await db.query(
        `INSERT INTO rsvps (event_id, user_id, role, status) VALUES ($1, $2, 'base', 'confirmed')`,
        [oldEventId, reviewerUserId],
      );

      await expect(
        submitReview(oldEventId, reviewerUserId, {
          teacherProfileId: profileId,
          rating: 3,
        }),
      ).rejects.toThrow("review window");
    });

    it("should reject duplicate review (unique constraint)", async () => {
      await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 5,
      });

      await expect(
        submitReview(eventId, reviewerUserId, {
          teacherProfileId: profileId,
          rating: 3,
        }),
      ).rejects.toThrow();
    });
  });

  describe("listReviewsForTeacher", () => {
    it("should list reviews with pagination and star distribution", async () => {
      // Submit reviews from multiple users
      const u2 = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('r2@test.com', 'Reviewer 2') RETURNING id",
      );
      await db.query(
        `INSERT INTO rsvps (event_id, user_id, role, status) VALUES ($1, $2, 'base', 'confirmed')`,
        [eventId, u2.rows[0].id],
      );

      await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 5,
        text: "Excellent!",
      });
      await submitReview(eventId, u2.rows[0].id, {
        teacherProfileId: profileId,
        rating: 4,
      });

      const result = await listReviewsForTeacher(profileId);
      expect(result.total).toBe(2);
      expect(result.reviews).toHaveLength(2);
      expect(result.distribution[5]).toBe(1);
      expect(result.distribution[4]).toBe(1);
    });

    it("should not include hidden reviews", async () => {
      const review = await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 5,
      });
      await hideReview(review.id, adminId, "inappropriate");

      const result = await listReviewsForTeacher(profileId);
      expect(result.total).toBe(0);
    });
  });

  describe("listReviewsForEvent", () => {
    it("should list reviews for an event", async () => {
      await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 4,
      });

      const result = await listReviewsForEvent(eventId);
      expect(result.total).toBe(1);
    });

    it("should filter by teacher profile ID", async () => {
      await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 4,
      });

      const filtered = await listReviewsForEvent(eventId, profileId);
      expect(filtered.total).toBe(1);

      const empty = await listReviewsForEvent(eventId, "00000000-0000-0000-0000-000000000000");
      expect(empty.total).toBe(0);
    });
  });

  describe("recalculateAggregate", () => {
    it("should compute correct average and count", async () => {
      // Create multiple reviews
      const u2 = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('r2@test.com', 'R2') RETURNING id",
      );
      await db.query(
        `INSERT INTO rsvps (event_id, user_id, role, status) VALUES ($1, $2, 'base', 'confirmed')`,
        [eventId, u2.rows[0].id],
      );

      await submitReview(eventId, reviewerUserId, { teacherProfileId: profileId, rating: 5 });
      await submitReview(eventId, u2.rows[0].id, { teacherProfileId: profileId, rating: 3 });

      const profile = await db.query<{ aggregate_rating: string; review_count: number }>(
        `SELECT aggregate_rating, review_count FROM teacher_profiles WHERE id = $1`,
        [profileId],
      );
      expect(parseFloat(profile.rows[0].aggregate_rating)).toBeCloseTo(4.0);
      expect(profile.rows[0].review_count).toBe(2);
    });

    it("should set null rating when all reviews are hidden", async () => {
      const review = await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 5,
      });
      await hideReview(review.id, adminId);

      const profile = await db.query<{ aggregate_rating: string | null; review_count: number }>(
        `SELECT aggregate_rating, review_count FROM teacher_profiles WHERE id = $1`,
        [profileId],
      );
      expect(profile.rows[0].aggregate_rating).toBeNull();
      expect(profile.rows[0].review_count).toBe(0);
    });
  });

  describe("hideReview / unhideReview", () => {
    it("should hide a review with reason", async () => {
      const review = await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 4,
      });

      const hidden = await hideReview(review.id, adminId, "Offensive content");
      expect(hidden!.is_hidden).toBe(true);
      expect(hidden!.hidden_reason).toBe("Offensive content");
      expect(hidden!.hidden_by).toBe(adminId);
    });

    it("should unhide a previously hidden review", async () => {
      const review = await submitReview(eventId, reviewerUserId, {
        teacherProfileId: profileId,
        rating: 4,
      });
      await hideReview(review.id, adminId, "reason");
      const unhidden = await unhideReview(review.id);
      expect(unhidden!.is_hidden).toBe(false);
      expect(unhidden!.hidden_by).toBeNull();
      expect(unhidden!.hidden_reason).toBeNull();
    });

    it("should recalculate aggregate when hiding/unhiding", async () => {
      const u2 = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('r2@test.com', 'R2') RETURNING id",
      );
      await db.query(
        `INSERT INTO rsvps (event_id, user_id, role, status) VALUES ($1, $2, 'base', 'confirmed')`,
        [eventId, u2.rows[0].id],
      );

      const r1 = await submitReview(eventId, reviewerUserId, { teacherProfileId: profileId, rating: 5 });
      await submitReview(eventId, u2.rows[0].id, { teacherProfileId: profileId, rating: 3 });

      // Average should be 4.0
      let p = await db.query<{ aggregate_rating: string }>(`SELECT aggregate_rating FROM teacher_profiles WHERE id = $1`, [profileId]);
      expect(parseFloat(p.rows[0].aggregate_rating)).toBeCloseTo(4.0);

      // Hide the 5-star review — average should become 3.0
      await hideReview(r1.id, adminId);
      p = await db.query<{ aggregate_rating: string }>(`SELECT aggregate_rating FROM teacher_profiles WHERE id = $1`, [profileId]);
      expect(parseFloat(p.rows[0].aggregate_rating)).toBeCloseTo(3.0);

      // Unhide — average back to 4.0
      await unhideReview(r1.id);
      p = await db.query<{ aggregate_rating: string }>(`SELECT aggregate_rating FROM teacher_profiles WHERE id = $1`, [profileId]);
      expect(parseFloat(p.rows[0].aggregate_rating)).toBeCloseTo(4.0);
    });

    it("should return null for non-existent review", async () => {
      const result = await hideReview("00000000-0000-0000-0000-000000000000", adminId);
      expect(result).toBeNull();
    });
  });
});
