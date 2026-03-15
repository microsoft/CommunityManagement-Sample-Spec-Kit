import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createEvent } from "@/lib/events/service";
import { getCreditBalance, applyCredits } from "@/lib/credits/service";
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

describe("Credits Service", () => {
  let eventId: string;
  let rsvpId: string;

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

    const event = await createEvent({
      title: "Paid Event",
      startDatetime: futureDate(14),
      endDatetime: futureDate(15),
      venueId,
      category: "workshop",
      skillLevel: "beginner",
      capacity: 10,
      cost: 30,
      currency: "GBP",
    }, creatorId);
    eventId = event.id;

    // Create an RSVP to reference
    const rsvpResult = await db.query<{ id: string }>(
      "INSERT INTO rsvps (event_id, user_id, role, name_visible, status) VALUES ($1, $2, 'base', true, 'confirmed') RETURNING id",
      [eventId, userId],
    );
    rsvpId = rsvpResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should return zero balance when no credits exist", async () => {
    const balance = await getCreditBalance(userId, creatorId);
    expect(balance.balance).toBe(0);
  });

  it("should track credit balance after issuing", async () => {
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 30, 'GBP', 30, $3, $4)",
      [userId, creatorId, eventId, rsvpId],
    );

    const balance = await getCreditBalance(userId, creatorId);
    expect(balance.balance).toBe(30);
    expect(balance.currency).toBe("GBP");
  });

  it("should apply credits fully when balance sufficient", async () => {
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 30, 'GBP', 30, $3, $4)",
      [userId, creatorId, eventId, rsvpId],
    );

    const result = await applyCredits(userId, creatorId, 20, "GBP");
    expect(result.applied).toBe(20);
    expect(result.remaining).toBe(0);

    const balance = await getCreditBalance(userId, creatorId);
    expect(balance.balance).toBe(10);
  });

  it("should apply partial credits when balance insufficient", async () => {
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 15, 'GBP', 15, $3, $4)",
      [userId, creatorId, eventId, rsvpId],
    );

    const result = await applyCredits(userId, creatorId, 25, "GBP");
    expect(result.applied).toBe(15);
    expect(result.remaining).toBe(10);
  });

  it("should apply credits FIFO across multiple credit records", async () => {
    // Issue two credits
    const rsvp2Result = await db.query<{ id: string }>(
      "INSERT INTO rsvps (event_id, user_id, role, name_visible, status) VALUES ($1, $2, 'base', true, 'confirmed') RETURNING id",
      [eventId, userId],
    );
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 10, 'GBP', 10, $3, $4)",
      [userId, creatorId, eventId, rsvpId],
    );
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 20, 'GBP', 20, $3, $4)",
      [userId, creatorId, eventId, rsvp2Result.rows[0].id],
    );

    const result = await applyCredits(userId, creatorId, 25, "GBP");
    expect(result.applied).toBe(25);
    expect(result.remaining).toBe(0);

    const balance = await getCreditBalance(userId, creatorId);
    expect(balance.balance).toBe(5);
  });
});
