import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  assignTeacher,
  removeTeacher,
  listTeachersForEvent,
  listEventsForTeacher,
} from "@/lib/teachers/event-teachers";
import fs from "fs";
import path from "path";

let db: PGlite;
let userId: string;
let creatorId: string;
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

async function createEvent(pglite: PGlite, creator: string, title: string, startDt: string, endDt: string) {
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
     VALUES ('Test Venue', '123 Test St', $1, 51.5, -0.12, $2) RETURNING id`,
    [city.rows[0].id, creator],
  );

  const result = await pglite.query<{ id: string }>(
    `INSERT INTO events (title, description, start_datetime, end_datetime, venue_id, category, skill_level, capacity, created_by)
     VALUES ($1, 'Test event', $2, $3, $4, 'workshop', 'all_levels', 20, $5) RETURNING id`,
    [title, startDt, endDt, venue.rows[0].id, creator],
  );
  return result.rows[0].id;
}

describe("Event Teachers", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const u1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('teacher@test.com', 'Teacher Alice') RETURNING id",
    );
    userId = u1.rows[0].id;

    const u2 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('creator@test.com', 'Event Creator') RETURNING id",
    );
    creatorId = u2.rows[0].id;

    const p = await db.query<{ id: string }>(
      `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
       VALUES ($1, $2, 'verified') RETURNING id`,
      [userId, ["washing_machines"]],
    );
    profileId = p.rows[0].id;

    // Create a future event
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const futureEnd = new Date(future);
    futureEnd.setHours(futureEnd.getHours() + 2);
    eventId = await createEvent(db, creatorId, "Workshop A", future.toISOString(), futureEnd.toISOString());
  }, 30000);

  afterEach(async () => {
    clearTestDb();
    await db.close();
  }, 30000);

  describe("assignTeacher", () => {
    it("should assign teacher to event as lead", async () => {
      const result = await assignTeacher(eventId, profileId, "lead");
      expect(result.event_id).toBe(eventId);
      expect(result.teacher_profile_id).toBe(profileId);
      expect(result.role).toBe("lead");
    });

    it("should assign teacher as assistant", async () => {
      const result = await assignTeacher(eventId, profileId, "assistant");
      expect(result.role).toBe("assistant");
    });

    it("should upsert on duplicate assignment (change role)", async () => {
      await assignTeacher(eventId, profileId, "lead");
      const result = await assignTeacher(eventId, profileId, "assistant");
      expect(result.role).toBe("assistant");
    });

    it("should throw when teacher profile not found", async () => {
      await expect(
        assignTeacher(eventId, "00000000-0000-0000-0000-000000000000", "lead"),
      ).rejects.toThrow("not found");
    });

    it("should throw when teacher profile is deleted", async () => {
      await db.query(`UPDATE teacher_profiles SET is_deleted = true WHERE id = $1`, [profileId]);
      await expect(assignTeacher(eventId, profileId, "lead")).rejects.toThrow("not found");
    });
  });

  describe("removeTeacher", () => {
    it("should remove an assigned teacher", async () => {
      await assignTeacher(eventId, profileId, "lead");
      const result = await removeTeacher(eventId, profileId);
      expect(result).toBe(true);

      const list = await listTeachersForEvent(eventId);
      expect(list).toHaveLength(0);
    });

    it("should return false when teacher not assigned", async () => {
      const result = await removeTeacher(eventId, profileId);
      expect(result).toBe(false);
    });
  });

  describe("listTeachersForEvent", () => {
    it("should return all teachers assigned to an event", async () => {
      await assignTeacher(eventId, profileId, "lead");

      // Add second teacher
      const u3 = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('t2@test.com', 'Bob Teacher') RETURNING id",
      );
      const p2 = await db.query<{ id: string }>(
        `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
         VALUES ($1, '{}', 'verified') RETURNING id`,
        [u3.rows[0].id],
      );
      await assignTeacher(eventId, p2.rows[0].id, "assistant");

      const list = await listTeachersForEvent(eventId);
      expect(list).toHaveLength(2);
      expect(list[0].teacher_name).toBeDefined();
      expect(list[0].badge_status).toBe("verified");
    });
  });

  describe("listEventsForTeacher", () => {
    it("should list upcoming events for teacher", async () => {
      await assignTeacher(eventId, profileId, "lead");
      const events = await listEventsForTeacher(profileId, "upcoming");
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Workshop A");
    });

    it("should list past events for teacher", async () => {
      // Create a past event
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const pastEnd = new Date(past);
      pastEnd.setHours(pastEnd.getHours() + 2);
      const pastEventId = await createEvent(db, creatorId, "Past Workshop", past.toISOString(), pastEnd.toISOString());
      await assignTeacher(pastEventId, profileId, "lead");

      const events = await listEventsForTeacher(profileId, "past");
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Past Workshop");
    });
  });
});
