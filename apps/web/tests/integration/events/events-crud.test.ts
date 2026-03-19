import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createEvent, listEvents, getEventById, updateEvent, cancelEvent } from "@/lib/events/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let userId: string;
let venueId: string;

async function applyMigrations(db: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await db.exec(sql);
  }
}

async function seedBasics(pglite: PGlite) {
  const userResult = await pglite.query<{ id: string }>(
    "INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id",
  );
  userId = userResult.rows[0].id;

  await pglite.query(
    "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'United Kingdom', 'GB', 'EU')",
  );
  const cityResult = await pglite.query<{ id: string }>(
    "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5074, -0.1278, 'Europe/London') RETURNING id",
  );
  const venueResult = await pglite.query<{ id: string }>(
    "INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Hall', '1 St', $1, 51.5074, -0.1278, $2) RETURNING id",
    [cityResult.rows[0].id, userId],
  );
  venueId = venueResult.rows[0].id;
}

function futureDate(daysFromNow: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("Events Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);
    await seedBasics(db);
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should create an event", async () => {
    const event = await createEvent({
      title: "Morning Jam",
      startDatetime: futureDate(7, 10),
      endDatetime: futureDate(7, 18),
      venueId,
      category: "jam",
      skillLevel: "all_levels",
      capacity: 20,
    }, userId);

    expect(event.title).toBe("Morning Jam");
    expect(event.category).toBe("jam");
    expect(event.capacity).toBe(20);
    expect(event.confirmedCount).toBe(0);
    expect(event.createdBy).toBe(userId);
  });

  it("should list published events", async () => {
    await createEvent({
      title: "Event 1",
      startDatetime: futureDate(7),
      endDatetime: futureDate(8),
      venueId,
      category: "workshop",
      skillLevel: "beginner",
      capacity: 10,
    }, userId);

    await createEvent({
      title: "Event 2",
      startDatetime: futureDate(14),
      endDatetime: futureDate(15),
      venueId,
      category: "jam",
      skillLevel: "advanced",
      capacity: 30,
    }, userId);

    const result = await listEvents({});
    expect(result.events).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("should filter events by category", async () => {
    await createEvent({ title: "Workshop", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, userId);
    await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, userId);

    const result = await listEvents({ category: "workshop" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Workshop");
  });

  it("should filter events by skill level including all_levels", async () => {
    await createEvent({ title: "Beginner", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "beginner", capacity: 10 }, userId);
    await createEvent({ title: "All Levels", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, userId);
    await createEvent({ title: "Advanced", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "advanced", capacity: 10 }, userId);

    const result = await listEvents({ skillLevel: "beginner" });
    expect(result.events).toHaveLength(2); // beginner + all_levels
  });

  it("should filter events by city slug", async () => {
    await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, userId);

    const result = await listEvents({ city: "london" });
    expect(result.events).toHaveLength(1);

    const empty = await listEvents({ city: "paris" });
    expect(empty.events).toHaveLength(0);
  });

  it("should get event detail with role breakdown", async () => {
    const event = await createEvent({ title: "Detail Test", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, userId);

    const detail = await getEventById(event.id);
    expect(detail).not.toBeNull();
    expect(detail!.venue.name).toBe("Hall");
    expect(detail!.roleBreakdown).toEqual({ base: 0, flyer: 0, hybrid: 0, hint: "" });
    expect(detail!.attendees).toEqual([]);
  });

  it("should update an event", async () => {
    const event = await createEvent({ title: "Original", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, userId);
    const updated = await updateEvent(event.id, { title: "Updated", capacity: 50 });
    expect(updated!.title).toBe("Updated");
    expect(updated!.capacity).toBe(50);
  });

  it("should cancel an event", async () => {
    const event = await createEvent({ title: "To Cancel", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, userId);
    const cancelled = await cancelEvent(event.id);
    expect(cancelled!.status).toBe("cancelled");
  });

  it("should paginate results", async () => {
    for (let i = 0; i < 5; i++) {
      await createEvent({ title: `Event ${i}`, startDatetime: futureDate(7 + i), endDatetime: futureDate(8 + i), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, userId);
    }

    const page1 = await listEvents({ page: 1, pageSize: 2 });
    expect(page1.events).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page3 = await listEvents({ page: 3, pageSize: 2 });
    expect(page3.events).toHaveLength(1);
  });
});
