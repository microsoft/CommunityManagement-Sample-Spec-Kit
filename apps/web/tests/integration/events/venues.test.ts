import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createVenue, listVenues, getVenueById, updateVenue, deleteVenue } from "@/lib/venues/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let userId: string;
let cityId: string;

async function applyMigrations(db: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await db.exec(sql);
  }
}

describe("Venues Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    // Seed required data
    const userResult = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id",
    );
    userId = userResult.rows[0].id;

    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'United Kingdom', 'GB', 'EU')",
    );
    const cityResult = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5074, -0.1278, 'Europe/London') RETURNING id",
    );
    cityId = cityResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should create a venue", async () => {
    const venue = await createVenue({
      name: "Community Hall",
      address: "123 Main St, London",
      cityId,
      latitude: 51.5074,
      longitude: -0.1278,
    }, userId);

    expect(venue.name).toBe("Community Hall");
    expect(venue.cityName).toBe("London");
    expect(venue.createdBy).toBe(userId);
  });

  it("should list venues", async () => {
    await createVenue({ name: "Hall A", address: "1 St", cityId, latitude: 51.5, longitude: -0.1 }, userId);
    await createVenue({ name: "Hall B", address: "2 St", cityId, latitude: 51.5, longitude: -0.1 }, userId);

    const venues = await listVenues();
    expect(venues).toHaveLength(2);
  });

  it("should filter venues by city", async () => {
    await createVenue({ name: "Hall", address: "1 St", cityId, latitude: 51.5, longitude: -0.1 }, userId);
    const venues = await listVenues({ cityId });
    expect(venues).toHaveLength(1);

    const noVenues = await listVenues({ cityId: "99999999-9999-9999-9999-999999999999" });
    expect(noVenues).toHaveLength(0);
  });

  it("should get venue by id", async () => {
    const created = await createVenue({ name: "Studio", address: "5 Ave", cityId, latitude: 51.5, longitude: -0.1 }, userId);
    const fetched = await getVenueById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Studio");
  });

  it("should update a venue", async () => {
    const created = await createVenue({ name: "Old Name", address: "1 St", cityId, latitude: 51.5, longitude: -0.1 }, userId);
    const updated = await updateVenue(created.id, { name: "New Name" });
    expect(updated!.name).toBe("New Name");
  });

  it("should delete a venue", async () => {
    const created = await createVenue({ name: "Temp", address: "1 St", cityId, latitude: 51.5, longitude: -0.1 }, userId);
    const deleted = await deleteVenue(created.id);
    expect(deleted).toBe(true);

    const fetched = await getVenueById(created.id);
    expect(fetched).toBeNull();
  });
});
