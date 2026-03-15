import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  createBooking,
  getBooking,
  listUserBookings,
  cancelBooking,
  completeBookingPayment,
} from "@/lib/bookings/service";
import { createEventGroup } from "@/lib/event-groups/service";
import { createTicketType } from "@/lib/event-groups/ticket-types";
import fs from "fs";
import path from "path";

let db: PGlite;
let creatorId: string;
let userId: string;
let venueId: string;
let groupId: string;
let ticketTypeId: string;
let eventIdForCredits: string;

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

describe("Bookings Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id",
    );
    creatorId = r1.rows[0].id;
    const r2 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('user@test.com', 'User') RETURNING id",
    );
    userId = r2.rows[0].id;

    await db.query(
      "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'UK', 'GB', 'EU')",
    );
    const cityResult = await db.query<{ id: string }>(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ('London', 'london', '00000000-0000-0000-0000-000000000001', 51.5, -0.1, 'Europe/London') RETURNING id",
    );
    const venueResult = await db.query<{ id: string }>(
      "INSERT INTO venues (name, address, city_id, latitude, longitude, created_by) VALUES ('Hall', '1 Main St', $1, 51.5, -0.1, $2) RETURNING id",
      [cityResult.rows[0].id, creatorId],
    );
    venueId = venueResult.rows[0].id;

    const e1 = await db.query<{ id: string }>(
      `INSERT INTO events (title, description, start_datetime, end_datetime, venue_id, capacity, created_by, category, skill_level)
       VALUES ('Event 1', 'Day 1', $1, $2, $3, 100, $4, 'festival', 'all_levels') RETURNING id`,
      [futureDate(10), futureDate(11), venueId, creatorId],
    );
    eventIdForCredits = e1.rows[0].id;

    const group = await createEventGroup(
      {
        name: "Festival",
        type: "festival",
        startDate: "2025-07-01",
        endDate: "2025-07-03",
        currency: "GBP",
        eventIds: [e1.rows[0].id],
      },
      creatorId,
    );
    groupId = group.id;

    const ticket = await createTicketType(groupId, {
      name: "General Admission",
      cost: 50,
      concessionCost: 25,
      capacity: 10,
      coversAllEvents: true,
    });
    ticketTypeId = ticket.id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should create a standard booking", async () => {
    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "standard",
    });
    expect(booking.user_id).toBe(userId);
    expect(booking.pricing_tier).toBe("standard");
    expect(parseFloat(String(booking.amount_paid))).toBe(50);
    expect(booking.payment_status).toBe("pending");
  });

  it("should create a concession booking when approved", async () => {
    await db.query(
      "INSERT INTO concession_statuses (user_id, status, evidence) VALUES ($1, 'approved', 'Student ID')",
      [userId],
    );

    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "concession",
    });
    expect(booking.pricing_tier).toBe("concession");
    expect(parseFloat(String(booking.amount_paid))).toBe(25);
  });

  it("should reject concession booking without approval", async () => {
    await expect(
      createBooking(userId, {
        ticketTypeId,
        pricingTier: "concession",
      }),
    ).rejects.toThrow("does not have approved concession");
  });

  it("should apply credits to reduce amount paid", async () => {
    const rsvp = await db.query<{ id: string }>(
      "INSERT INTO rsvps (event_id, user_id, status, role) VALUES ($1, $2, 'confirmed', 'base') RETURNING id",
      [eventIdForCredits, userId],
    );
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 20, 'GBP', 20, $3, $4)",
      [userId, creatorId, eventIdForCredits, rsvp.rows[0].id],
    );

    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "standard",
      useCredits: true,
    });
    expect(parseFloat(String(booking.credits_applied))).toBe(20);
    expect(parseFloat(String(booking.amount_paid))).toBe(30);

    // Verify credit balance was reduced
    const creditResult = await db.query<{ remaining_balance: string }>(
      "SELECT remaining_balance FROM credits WHERE user_id = $1",
      [userId],
    );
    expect(parseFloat(creditResult.rows[0].remaining_balance)).toBe(0);
  });

  it("should auto-complete when credits cover full amount", async () => {
    const rsvp = await db.query<{ id: string }>(
      "INSERT INTO rsvps (event_id, user_id, status, role) VALUES ($1, $2, 'confirmed', 'base') RETURNING id",
      [eventIdForCredits, userId],
    );
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 100, 'GBP', 100, $3, $4)",
      [userId, creatorId, eventIdForCredits, rsvp.rows[0].id],
    );

    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "standard",
      useCredits: true,
    });
    expect(parseFloat(String(booking.amount_paid))).toBe(0);
    expect(booking.payment_status).toBe("completed");
  });

  it("should reject booking when sold out", async () => {
    // Fill capacity
    for (let i = 0; i < 10; i++) {
      const u = await db.query<{ id: string }>(
        `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
        [`user${i}@test.com`, `User${i}`],
      );
      await createBooking(u.rows[0].id, {
        ticketTypeId,
        pricingTier: "standard",
      });
    }

    await expect(
      createBooking(userId, { ticketTypeId, pricingTier: "standard" }),
    ).rejects.toThrow("sold out");
  });

  it("should get booking details", async () => {
    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "standard",
    });
    const detail = await getBooking(booking.id);
    expect(detail).not.toBeNull();
    expect(detail!.ticket_type_name).toBe("General Admission");
    expect(detail!.group_name).toBe("Festival");
  });

  it("should list user bookings", async () => {
    await createBooking(userId, { ticketTypeId, pricingTier: "standard" });
    const bookings = await listUserBookings(userId);
    expect(bookings.length).toBe(1);
  });

  it("should cancel a booking", async () => {
    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "standard",
    });
    const cancelled = await cancelBooking(booking.id, "no_refund");
    expect(cancelled!.payment_status).toBe("cancelled");
    expect(cancelled!.cancellation_type).toBe("no_refund");
  });

  it("should refund credits on cancellation", async () => {
    const rsvp = await db.query<{ id: string }>(
      "INSERT INTO rsvps (event_id, user_id, status, role) VALUES ($1, $2, 'confirmed', 'base') RETURNING id",
      [eventIdForCredits, userId],
    );
    await db.query(
      "INSERT INTO credits (user_id, creator_id, amount, currency, remaining_balance, issued_from_event_id, issued_from_rsvp_id) VALUES ($1, $2, 20, 'GBP', 20, $3, $4)",
      [userId, creatorId, eventIdForCredits, rsvp.rows[0].id],
    );
    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "standard",
      useCredits: true,
    });

    await cancelBooking(booking.id, "no_refund");

    const creditResult = await db.query<{ remaining_balance: string }>(
      "SELECT remaining_balance FROM credits WHERE user_id = $1",
      [userId],
    );
    expect(parseFloat(creditResult.rows[0].remaining_balance)).toBe(20);
  });

  it("should reject cancelling an already cancelled booking", async () => {
    const booking = await createBooking(userId, { ticketTypeId, pricingTier: "standard" });
    await cancelBooking(booking.id, "no_refund");
    await expect(cancelBooking(booking.id, "no_refund")).rejects.toThrow("already cancelled");
  });

  it("should complete payment", async () => {
    const booking = await createBooking(userId, {
      ticketTypeId,
      pricingTier: "standard",
    });
    const completed = await completeBookingPayment(booking.id, "ch_test_123");
    expect(completed!.payment_status).toBe("completed");
    expect(completed!.stripe_charge_id).toBe("ch_test_123");
  });

  it("should not complete already completed payment", async () => {
    const booking = await createBooking(userId, { ticketTypeId, pricingTier: "standard" });
    await completeBookingPayment(booking.id, "ch_1");
    const second = await completeBookingPayment(booking.id, "ch_2");
    expect(second).toBeNull();
  });
});
