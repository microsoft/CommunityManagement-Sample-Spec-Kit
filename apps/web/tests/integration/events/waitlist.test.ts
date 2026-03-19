import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createEvent } from "@/lib/events/service";
import { createRsvp, cancelRsvp } from "@/lib/rsvp/service";
import { joinWaitlist, getEventWaitlist, leaveWaitlist } from "@/lib/waitlist/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let creatorId: string;
let userId: string;
let user2Id: string;
let user3Id: string;
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

describe("Waitlist Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id");
    creatorId = r1.rows[0].id;
    const r2 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('user1@test.com', 'User1') RETURNING id");
    userId = r2.rows[0].id;
    const r3 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('user2@test.com', 'User2') RETURNING id");
    user2Id = r3.rows[0].id;
    const r4 = await db.query<{ id: string }>("INSERT INTO users (email, name) VALUES ('user3@test.com', 'User3') RETURNING id");
    user3Id = r4.rows[0].id;

    await db.query("INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')");
    const cityResult = await db.query<{ id: string }>("INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5, -0.1, 'Europe/London') RETURNING id");
    const venueResult = await db.query<{ id: string }>("INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Hall', '1 St', $1, 51.5, -0.1, $2) RETURNING id", [cityResult.rows[0].id, creatorId]);
    venueId = venueResult.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should join waitlist with correct position", async () => {
    const event = await createEvent({ title: "Full Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 1 }, creatorId);

    const wl1 = await joinWaitlist(event.id, userId, "base");
    expect(wl1.entry).toBeDefined();
    expect(wl1.entry!.position).toBe(1);

    const wl2 = await joinWaitlist(event.id, user2Id, "flyer");
    expect(wl2.entry!.position).toBe(2);
  });

  it("should prevent duplicate waitlist entry", async () => {
    const event = await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 1 }, creatorId);

    await joinWaitlist(event.id, userId, "base");
    const dup = await joinWaitlist(event.id, userId, "flyer");
    expect(dup.error).toBe("Already on waitlist");
  });

  it("should list event waitlist in position order", async () => {
    const event = await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 1 }, creatorId);

    await joinWaitlist(event.id, user2Id, "flyer");
    await joinWaitlist(event.id, userId, "base");

    const list = await getEventWaitlist(event.id);
    expect(list).toHaveLength(2);
    expect(list[0].position).toBe(1);
    expect(list[1].position).toBe(2);
  });

  it("should leave waitlist", async () => {
    const event = await createEvent({ title: "Jam", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 1 }, creatorId);

    await joinWaitlist(event.id, userId, "base");
    const removed = await leaveWaitlist(event.id, userId);
    expect(removed).toBe(true);

    const list = await getEventWaitlist(event.id);
    expect(list).toHaveLength(0);
  });

  it("should auto-promote first waitlisted when RSVP is cancelled", async () => {
    const event = await createEvent({ title: "Auto Promote", startDatetime: futureDate(7), endDatetime: futureDate(8), venueId, category: "jam", skillLevel: "all_levels", capacity: 1 }, creatorId);

    // Fill the event
    await createRsvp(event.id, userId, { role: "base" });

    // Add to waitlist
    await joinWaitlist(event.id, user2Id, "flyer");
    await joinWaitlist(event.id, user3Id, "hybrid");

    // Cancel the RSVP — should auto-promote user2
    await cancelRsvp(event.id, userId, {});

    // Check user2 was promoted
    const rsvps = await db.query<{ user_id: string; status: string }>(
      "SELECT user_id, status FROM rsvps WHERE event_id = $1 AND status = 'confirmed'",
      [event.id],
    );
    const promotedUsers = rsvps.rows.map((r) => r.user_id);
    expect(promotedUsers).toContain(user2Id);

    // Check waitlist: user2 should be promoted, user3 still waiting
    const waitlist = await getEventWaitlist(event.id);
    expect(waitlist).toHaveLength(1);
    expect(waitlist[0].userId).toBe(user3Id);
  });
});
