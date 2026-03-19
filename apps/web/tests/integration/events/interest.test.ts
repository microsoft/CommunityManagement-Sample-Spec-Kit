import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createEvent } from "@/lib/events/service";
import { toggleInterest, getUserInterests, isInterested } from "@/lib/interests/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let creatorId: string;
let userId: string;
let venueId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

function futureDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

describe("Interest Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id");
    creatorId = r1.rows[0].id;
    const r2 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('user@test.com', 'User') RETURNING id");
    userId = r2.rows[0].id;

    await db.query("INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')");
    const cityResult = await db.query<{ id: string }>("INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5, -0.1, 'Europe/London') RETURNING id");
    const venueResult = await db.query<{ id: string }>("INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Hall', '1 St', $1, 51.5, -0.1, $2) RETURNING id", [cityResult.rows[0].id, creatorId]);
    venueId = venueResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should toggle interest on (mark interested)", async () => {
    const event = await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

    const result = await toggleInterest(event.id, userId);
    expect(result.interested).toBe(true);
    expect(result.count).toBe(1);
  });

  it("should toggle interest off (remove interest)", async () => {
    const event = await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

    await toggleInterest(event.id, userId);
    const result = await toggleInterest(event.id, userId);
    expect(result.interested).toBe(false);
    expect(result.count).toBe(0);
  });

  it("should get user interests", async () => {
    const event1 = await createEvent({ title: "A", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
    const event2 = await createEvent({ title: "B", startDatetime: futureDate(14), endDatetime: futureDate(15), venueId, category: "workshop", skillLevel: "beginner", capacity: 10 }, creatorId);

    await toggleInterest(event1.id, userId);
    await toggleInterest(event2.id, userId);

    const interests = await getUserInterests(userId);
    expect(interests).toHaveLength(2);
  });

  it("should check individual interest", async () => {
    const event = await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

    expect(await isInterested(event.id, userId)).toBe(false);
    await toggleInterest(event.id, userId);
    expect(await isInterested(event.id, userId)).toBe(true);
  });
});
