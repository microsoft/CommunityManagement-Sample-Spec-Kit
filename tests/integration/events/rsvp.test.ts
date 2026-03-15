import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createEvent } from "@/lib/events/service";
import { createRsvp, cancelRsvp, getEventRsvps, cancelAllEventRsvps } from "@/lib/rsvp/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let creatorId: string;
let userId: string;
let user2Id: string;
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

describe("RSVP Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id");
    creatorId = r1.rows[0].id;
    const r2 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('user@test.com', 'User') RETURNING id");
    userId = r2.rows[0].id;
    const r3 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('user2@test.com', 'User2') RETURNING id");
    user2Id = r3.rows[0].id;

    await db.query("INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')");
    const cityResult = await db.query<{ id: string }>("INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5, -0.1, 'Europe/London') RETURNING id");
    const venueResult = await db.query<{ id: string }>("INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Hall', '1 St', $1, 51.5, -0.1, $2) RETURNING id", [cityResult.rows[0].id, creatorId]);
    venueId = venueResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should create a free RSVP with confirmed status", async () => {
    const event = await createEvent({ title: "Free Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10, cost: 0 }, creatorId);

    const result = await createRsvp(event.id, userId, { role: "base" });
    expect(result.rsvp).toBeDefined();
    expect(result.rsvp!.status).toBe("confirmed");
    expect(result.rsvp!.role).toBe("base");
  });

  it("should create a paid RSVP with pending_payment status", async () => {
    const event = await createEvent({ title: "Paid Workshop", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "workshop", skillLevel: "beginner", capacity: 10, cost: 25, currency: "GBP" }, creatorId);

    const result = await createRsvp(event.id, userId, { role: "flyer" });
    expect(result.rsvp).toBeDefined();
    expect(result.rsvp!.status).toBe("pending_payment");
  });

  it("should enforce capacity limit", async () => {
    const event = await createEvent({ title: "Small Event", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 1 }, creatorId);

    const rsvp1 = await createRsvp(event.id, userId, { role: "base" });
    expect(rsvp1.rsvp).toBeDefined();

    const rsvp2 = await createRsvp(event.id, user2Id, { role: "flyer" });
    expect(rsvp2.error).toBe("Event is at capacity");
    expect(rsvp2.waitlisted).toBe(true);
  });

  it("should prevent duplicate RSVPs", async () => {
    const event = await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);

    await createRsvp(event.id, userId, { role: "base" });
    const dup = await createRsvp(event.id, userId, { role: "flyer" });
    expect(dup.error).toBe("You already have an active RSVP for this event");
  });

  it("should require prerequisite confirmation", async () => {
    const event = await createEvent({ title: "Adv Workshop", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "workshop", skillLevel: "advanced", capacity: 10, prerequisites: "Must know L-base" }, creatorId);

    const noConfirm = await createRsvp(event.id, userId, { role: "base" });
    expect(noConfirm.error).toBe("You must confirm that you meet the prerequisites");

    const withConfirm = await createRsvp(event.id, userId, { role: "base", prerequisiteConfirmed: true });
    expect(withConfirm.rsvp).toBeDefined();
  });

  it("should reject RSVP for cancelled event", async () => {
    const event = await createEvent({ title: "Cancelled", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
    await db.query("UPDATE events SET status = 'cancelled' WHERE id = $1", [event.id]);

    const result = await createRsvp(event.id, userId, { role: "base" });
    expect(result.error).toBe("Event is not available for RSVPs");
  });

  it("should cancel RSVP for free event", async () => {
    const event = await createEvent({ title: "Free Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10, cost: 0 }, creatorId);
    await createRsvp(event.id, userId, { role: "base" });

    const result = await cancelRsvp(event.id, userId, {});
    expect(result.rsvp).toBeDefined();
    expect(result.rsvp!.status).toBe("cancelled");
  });

  it("should issue credit when cancelling paid RSVP within refund window", async () => {
    const event = await createEvent({
      title: "Paid Workshop",
      startDatetime: futureDate(14),
      endDatetime: futureDate(15),
      venueId,
      category: "workshop",
      skillLevel: "beginner",
      capacity: 10,
      cost: 25,
      currency: "GBP",
      refundWindowHours: 24,
    }, creatorId);

    // Manually confirm the RSVP (skip payment)
    await db.query(
      "INSERT INTO rsvps (event_id, user_id, role, name_visible, status) VALUES ($1, $2, 'base', true, 'confirmed')",
      [event.id, userId],
    );

    const result = await cancelRsvp(event.id, userId, { refundChoice: "credit" });
    expect(result.rsvp!.status).toBe("cancelled");
    expect(result.rsvp!.cancellationType).toBe("credit");
    expect(result.credit).toBeDefined();
    expect(result.credit!.amount).toBe(25);
  });

  it("should cancel all RSVPs when event is cancelled", async () => {
    const event = await createEvent({ title: "Mass Cancel", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 10 }, creatorId);
    await createRsvp(event.id, userId, { role: "base" });
    await createRsvp(event.id, user2Id, { role: "flyer" });

    const count = await cancelAllEventRsvps(event.id);
    expect(count).toBe(2);

    const rsvps = await getEventRsvps(event.id);
    expect(rsvps.every((r) => r.status === "cancelled")).toBe(true);
    expect(rsvps.every((r) => r.cancellationType === "event_cancelled")).toBe(true);
  });
});
