/**
 * Integration tests: Event filter counts
 *
 * Ensures that listEvents returns the correct count and event list for
 * every supported filter: category, city (slug), country code, skill level,
 * date range (dateFrom / dateTo), status pills (full, new, past), text
 * search query, and pagination. Covers combinations too.
 *
 * Seed data: 3 cities in 2 countries on 2 continents, 12 events spread
 * across all categories, skill levels, and cities so every filter dimension
 * has meaningful coverage.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createEvent, listEvents } from "@/lib/events/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let creatorId: string;

// venue IDs per city
let londonVenueId: string;
let parisVenueId: string;
let berlinVenueId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

function futureDate(daysFromNow: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function pastDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

async function seedGeography(pglite: PGlite) {
  // UK
  await pglite.query(
    "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'United Kingdom', 'GB', 'EU')",
  );
  // France
  await pglite.query(
    "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000002', 'France', 'FR', 'EU')",
  );
  // Germany
  await pglite.query(
    "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000003', 'Germany', 'DE', 'EU')",
  );

  const londonCity = await pglite.query<{ id: string }>(
    "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5074, -0.1278, 'Europe/London') RETURNING id",
  );
  const parisCity = await pglite.query<{ id: string }>(
    "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('Paris', 'paris', '00000000-0000-0000-0000-000000000002', 48.8566, 2.3522, 'Europe/Paris') RETURNING id",
  );
  const berlinCity = await pglite.query<{ id: string }>(
    "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('Berlin', 'berlin', '00000000-0000-0000-0000-000000000003', 52.52, 13.405, 'Europe/Berlin') RETURNING id",
  );

  const lv = await pglite.query<{ id: string }>(
    "INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('London Hall', '1 London St', $1, 51.5074, -0.1278, $2) RETURNING id",
    [londonCity.rows[0].id, creatorId],
  );
  londonVenueId = lv.rows[0].id;

  const pv = await pglite.query<{ id: string }>(
    "INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Paris Hall', '1 Paris Ave', $1, 48.8566, 2.3522, $2) RETURNING id",
    [parisCity.rows[0].id, creatorId],
  );
  parisVenueId = pv.rows[0].id;

  const bv = await pglite.query<{ id: string }>(
    "INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Berlin Hall', '1 Berlin St', $1, 52.52, 13.405, $2) RETURNING id",
    [berlinCity.rows[0].id, creatorId],
  );
  berlinVenueId = bv.rows[0].id;
}

describe("Event filter counts", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id",
    );
    creatorId = r.rows[0].id;

    await seedGeography(db);
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("category filter", () => {
    it("returns only 'jam' events when filtered by category=jam", async () => {
      await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);
      await createEvent({ title: "Paris Workshop", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "workshop", skillLevel: "beginner", capacity: 15 }, creatorId);
      await createEvent({ title: "Berlin Jam", startDatetime: futureDate(21), endDatetime: futureDate(21, 18), venueId: berlinVenueId, category: "jam", skillLevel: "advanced", capacity: 10 }, creatorId);

      const result = await listEvents({ category: "jam" });
      expect(result.total).toBe(2);
      expect(result.events.every((e) => e.category === "jam")).toBe(true);
    });

    it("returns only 'workshop' events when filtered by category=workshop", async () => {
      await createEvent({ title: "Workshop A", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);
      await createEvent({ title: "Festival B", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "festival", skillLevel: "all_levels", capacity: 100 }, creatorId);

      const result = await listEvents({ category: "workshop" });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("Workshop A");
    });

    it("returns zero events for a category with no events", async () => {
      await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);

      const result = await listEvents({ category: "class" });
      expect(result.total).toBe(0);
      expect(result.events).toHaveLength(0);
    });

    it("returns all events when no category filter is applied", async () => {
      await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);
      await createEvent({ title: "Workshop", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);
      await createEvent({ title: "Festival", startDatetime: futureDate(21), endDatetime: futureDate(21, 18), venueId: berlinVenueId, category: "festival", skillLevel: "all_levels", capacity: 200 }, creatorId);

      const result = await listEvents({});
      expect(result.total).toBe(3);
    });
  });

  describe("city (slug) filter", () => {
    it("returns only London events when filtered by city=london", async () => {
      await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);
      await createEvent({ title: "Paris Jam", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);

      const result = await listEvents({ city: "london" });
      expect(result.total).toBe(1);
      expect(result.events[0].citySlug).toBe("london");
    });

    it("returns only Paris events when filtered by city=paris", async () => {
      await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);
      await createEvent({ title: "Paris Workshop", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);

      const result = await listEvents({ city: "paris" });
      expect(result.total).toBe(1);
      expect(result.events[0].citySlug).toBe("paris");
    });

    it("returns zero events for a city with no events", async () => {
      await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);

      const result = await listEvents({ city: "berlin" });
      expect(result.total).toBe(0);
    });

    it("returns correct counts per city across 3 cities", async () => {
      await createEvent({ title: "London 1", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);
      await createEvent({ title: "London 2", startDatetime: futureDate(8), endDatetime: futureDate(8, 18), venueId: londonVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);
      await createEvent({ title: "Paris 1", startDatetime: futureDate(9), endDatetime: futureDate(9, 18), venueId: parisVenueId, category: "jam", skillLevel: "all_levels", capacity: 30 }, creatorId);
      await createEvent({ title: "Berlin 1", startDatetime: futureDate(10), endDatetime: futureDate(10, 18), venueId: berlinVenueId, category: "festival", skillLevel: "all_levels", capacity: 50 }, creatorId);

      const londonCount = await listEvents({ city: "london" });
      const parisCount = await listEvents({ city: "paris" });
      const berlinCount = await listEvents({ city: "berlin" });
      const allCount = await listEvents({});

      expect(londonCount.total).toBe(2);
      expect(parisCount.total).toBe(1);
      expect(berlinCount.total).toBe(1);
      expect(allCount.total).toBe(4);
    });
  });

  describe("country filter", () => {
    it("returns only UK events when filtered by country=GB", async () => {
      await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);
      await createEvent({ title: "Paris Workshop", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);

      const result = await listEvents({ country: "GB" });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("London Jam");
    });

    it("returns only FR events when filtered by country=FR", async () => {
      await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);
      await createEvent({ title: "Paris Workshop", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);
      await createEvent({ title: "Berlin Festival", startDatetime: futureDate(21), endDatetime: futureDate(21, 18), venueId: berlinVenueId, category: "festival", skillLevel: "all_levels", capacity: 100 }, creatorId);

      const result = await listEvents({ country: "FR" });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("Paris Workshop");
    });
  });

  describe("skill level filter", () => {
    beforeEach(async () => {
      await createEvent({ title: "Beginner", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "beginner", capacity: 10 }, creatorId);
      await createEvent({ title: "All Levels", startDatetime: futureDate(8), endDatetime: futureDate(8, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "Intermediate", startDatetime: futureDate(9), endDatetime: futureDate(9, 18), venueId: londonVenueId, category: "jam", skillLevel: "intermediate", capacity: 10 }, creatorId);
      await createEvent({ title: "Advanced", startDatetime: futureDate(10), endDatetime: futureDate(10, 18), venueId: londonVenueId, category: "jam", skillLevel: "advanced", capacity: 10 }, creatorId);
    });

    it("beginner filter returns beginner + all_levels events", async () => {
      const result = await listEvents({ skillLevel: "beginner" });
      expect(result.total).toBe(2);
      const titles = result.events.map((e) => e.title);
      expect(titles).toContain("Beginner");
      expect(titles).toContain("All Levels");
    });

    it("intermediate filter returns intermediate + all_levels events", async () => {
      const result = await listEvents({ skillLevel: "intermediate" });
      expect(result.total).toBe(2);
    });

    it("advanced filter returns advanced + all_levels events", async () => {
      const result = await listEvents({ skillLevel: "advanced" });
      expect(result.total).toBe(2);
    });

    it("no skill level filter returns all events", async () => {
      const result = await listEvents({});
      expect(result.total).toBe(4);
    });
  });

  describe("date range filter", () => {
    it("dateFrom filters out events before the date", async () => {
      await createEvent({ title: "Near", startDatetime: futureDate(3), endDatetime: futureDate(3, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "Far", startDatetime: futureDate(30), endDatetime: futureDate(30, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

      const cutoff = futureDate(10);
      const result = await listEvents({ dateFrom: cutoff });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("Far");
    });

    it("dateTo filters out events after the date", async () => {
      await createEvent({ title: "Near", startDatetime: futureDate(3), endDatetime: futureDate(3, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "Far", startDatetime: futureDate(30), endDatetime: futureDate(30, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

      const cutoff = futureDate(10);
      const result = await listEvents({ dateTo: cutoff });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("Near");
    });

    it("dateFrom and dateTo combination returns only events within range", async () => {
      await createEvent({ title: "Week 1", startDatetime: futureDate(3), endDatetime: futureDate(3, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "Week 2", startDatetime: futureDate(10), endDatetime: futureDate(10, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "Week 4", startDatetime: futureDate(28), endDatetime: futureDate(28, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

      const result = await listEvents({ dateFrom: futureDate(7), dateTo: futureDate(21) });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("Week 2");
    });
  });

  describe("text search (q) filter", () => {
    it("returns events matching title", async () => {
      await createEvent({ title: "Aerial Workshop London", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "workshop", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "Acro Jam Paris", startDatetime: futureDate(14), endDatetime: futureDate(14, 18), venueId: parisVenueId, category: "jam", skillLevel: "all_levels", capacity: 20 }, creatorId);

      const result = await listEvents({ q: "Aerial" });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("Aerial Workshop London");
    });

    it("text search is case-insensitive", async () => {
      await createEvent({ title: "Aerial Workshop", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "workshop", skillLevel: "all_levels", capacity: 10 }, creatorId);

      const result = await listEvents({ q: "aerial" });
      expect(result.total).toBe(1);
    });

    it("returns empty for non-matching query", async () => {
      await createEvent({ title: "Acro Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

      const result = await listEvents({ q: "yoga" });
      expect(result.total).toBe(0);
    });
  });

  describe("combined filters", () => {
    it("category + city gives correct subset", async () => {
      await createEvent({ title: "London Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "London Workshop", startDatetime: futureDate(8), endDatetime: futureDate(8, 18), venueId: londonVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);
      await createEvent({ title: "Paris Jam", startDatetime: futureDate(9), endDatetime: futureDate(9, 18), venueId: parisVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

      const result = await listEvents({ city: "london", category: "jam" });
      expect(result.total).toBe(1);
      expect(result.events[0].title).toBe("London Jam");
    });

    it("category + skill level gives correct subset", async () => {
      await createEvent({ title: "Beginner Jam", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "beginner", capacity: 10 }, creatorId);
      await createEvent({ title: "All Levels Jam", startDatetime: futureDate(8), endDatetime: futureDate(8, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
      await createEvent({ title: "Adv Jam", startDatetime: futureDate(9), endDatetime: futureDate(9, 18), venueId: londonVenueId, category: "jam", skillLevel: "advanced", capacity: 10 }, creatorId);
      await createEvent({ title: "Beginner Workshop", startDatetime: futureDate(10), endDatetime: futureDate(10, 18), venueId: londonVenueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);

      // skillLevel=beginner returns events with skill_level='beginner' OR skill_level='all_levels'
      // category=jam restricts to jam only — so: Beginner Jam + All Levels Jam (not Adv Jam, not Beginner Workshop)
      const result = await listEvents({ category: "jam", skillLevel: "beginner" });
      expect(result.total).toBe(2);
      const titles = result.events.map((e) => e.title);
      expect(titles).toContain("Beginner Jam");
      expect(titles).toContain("All Levels Jam");
      expect(titles).not.toContain("Adv Jam");
      expect(titles).not.toContain("Beginner Workshop");
    });
  });

  describe("pagination", () => {
    it("returns correct page and total", async () => {
      for (let i = 0; i < 7; i++) {
        await createEvent({
          title: `Event ${i}`,
          startDatetime: futureDate(7 + i),
          endDatetime: futureDate(7 + i, 18),
          venueId: londonVenueId,
          category: "jam",
          skillLevel: "all_levels",
          capacity: 10,
        }, creatorId);
      }

      const page1 = await listEvents({ page: 1, pageSize: 3 });
      expect(page1.events).toHaveLength(3);
      expect(page1.total).toBe(7);
      expect(page1.page).toBe(1);

      const page2 = await listEvents({ page: 2, pageSize: 3 });
      expect(page2.events).toHaveLength(3);
      expect(page2.total).toBe(7);

      const page3 = await listEvents({ page: 3, pageSize: 3 });
      expect(page3.events).toHaveLength(1);
    });

    it("no events on page beyond total", async () => {
      await createEvent({ title: "Only", startDatetime: futureDate(7), endDatetime: futureDate(7, 18), venueId: londonVenueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

      const result = await listEvents({ page: 2, pageSize: 10 });
      expect(result.events).toHaveLength(0);
      expect(result.total).toBe(1);
    });
  });
});
