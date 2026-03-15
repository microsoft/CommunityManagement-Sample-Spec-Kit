import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  applyConcession,
  getConcessionStatus,
  listPendingConcessions,
  reviewConcession,
  revokeConcession,
} from "@/lib/concessions/service";
import { checkCapacity, checkTicketCapacity } from "@/lib/events/capacity";
import { createEventGroup } from "@/lib/event-groups/service";
import { createTicketType } from "@/lib/event-groups/ticket-types";
import { createBooking } from "@/lib/bookings/service";
import fs from "fs";
import path from "path";

let db: PGlite;
let userId: string;
let adminId: string;
let creatorId: string;
let venueId: string;
let eventId: string;

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

describe("Concessions & Capacity", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('user@test.com', 'User') RETURNING id",
    );
    userId = r1.rows[0].id;

    const r2 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('admin@test.com', 'Admin') RETURNING id",
    );
    adminId = r2.rows[0].id;

    const r3 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id",
    );
    creatorId = r3.rows[0].id;

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

    const e = await db.query<{ id: string }>(
      `INSERT INTO events (title, description, start_datetime, end_datetime, venue_id, capacity, created_by, category, skill_level)
       VALUES ('Event', 'Test', $1, $2, $3, 5, $4, 'social', 'all_levels') RETURNING id`,
      [futureDate(10), futureDate(11), venueId, creatorId],
    );
    eventId = e.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("Concession Application", () => {
    it("should apply for concession", async () => {
      const status = await applyConcession(userId, { evidence: "Student ID photo" });
      expect(status.status).toBe("pending");
      expect(status.evidence).toBe("Student ID photo");
      expect(status.user_id).toBe(userId);
    });

    it("should reject duplicate pending application", async () => {
      await applyConcession(userId, { evidence: "ID" });
      await expect(
        applyConcession(userId, { evidence: "Another ID" }),
      ).rejects.toThrow("pending");
    });

    it("should reject application when already approved", async () => {
      const status = await applyConcession(userId, { evidence: "ID" });
      await reviewConcession(status.id, adminId, { decision: "approved" });
      await expect(
        applyConcession(userId, { evidence: "New ID" }),
      ).rejects.toThrow("approved");
    });

    it("should get concession status", async () => {
      await applyConcession(userId, { evidence: "ID" });
      const status = await getConcessionStatus(userId);
      expect(status).not.toBeNull();
      expect(status!.status).toBe("pending");
    });

    it("should return null for user without concession", async () => {
      const status = await getConcessionStatus(userId);
      expect(status).toBeNull();
    });
  });

  describe("Concession Review", () => {
    it("should approve a concession", async () => {
      const app = await applyConcession(userId, { evidence: "ID" });
      const result = await reviewConcession(app.id, adminId, { decision: "approved" });
      expect(result!.status).toBe("approved");
      expect(result!.approved_by).toBe(adminId);
    });

    it("should reject a concession", async () => {
      const app = await applyConcession(userId, { evidence: "ID" });
      const result = await reviewConcession(app.id, adminId, { decision: "rejected" });
      expect(result!.status).toBe("rejected");
      expect(result!.rejected_by).toBe(adminId);
    });

    it("should not review non-pending concession", async () => {
      const app = await applyConcession(userId, { evidence: "ID" });
      await reviewConcession(app.id, adminId, { decision: "approved" });
      await expect(
        reviewConcession(app.id, adminId, { decision: "rejected" }),
      ).rejects.toThrow("Cannot review");
    });

    it("should list pending concessions", async () => {
      await applyConcession(userId, { evidence: "ID" });
      const pending = await listPendingConcessions();
      expect(pending.length).toBe(1);
    });

    it("should return null for non-existent concession", async () => {
      const result = await reviewConcession(
        "00000000-0000-0000-0000-000000000099",
        adminId,
        { decision: "approved" },
      );
      expect(result).toBeNull();
    });
  });

  describe("Concession Revocation", () => {
    it("should revoke an approved concession", async () => {
      const app = await applyConcession(userId, { evidence: "ID" });
      await reviewConcession(app.id, adminId, { decision: "approved" });

      const revoked = await revokeConcession(userId, adminId);
      expect(revoked!.status).toBe("revoked");
      expect(revoked!.revoked_by).toBe(adminId);
    });

    it("should return null when no approved concession to revoke", async () => {
      const result = await revokeConcession(userId, adminId);
      expect(result).toBeNull();
    });
  });

  describe("Event Capacity", () => {
    it("should check capacity for a non-recurring event", async () => {
      const cap = await checkCapacity(eventId);
      expect(cap.capacity).toBe(5);
      expect(cap.used).toBe(0);
      expect(cap.remaining).toBe(5);
    });

    it("should reflect RSVPs in capacity", async () => {
      await db.query(
        "INSERT INTO rsvps (event_id, user_id, status, role) VALUES ($1, $2, 'confirmed', 'base')",
        [eventId, userId],
      );
      const cap = await checkCapacity(eventId);
      expect(cap.used).toBe(1);
      expect(cap.remaining).toBe(4);
    });

    it("should check capacity per occurrence date", async () => {
      await db.query(
        "INSERT INTO rsvps (event_id, user_id, status, role, occurrence_date) VALUES ($1, $2, 'confirmed', 'base', '2025-03-10')",
        [eventId, userId],
      );
      const cap = await checkCapacity(eventId, "2025-03-10");
      expect(cap.used).toBe(1);

      const otherCap = await checkCapacity(eventId, "2025-03-17");
      expect(otherCap.used).toBe(0);
    });

    it("should throw for non-existent event", async () => {
      await expect(
        checkCapacity("00000000-0000-0000-0000-000000000099"),
      ).rejects.toThrow("not found");
    });
  });

  describe("Ticket Capacity", () => {
    it("should check ticket type capacity", async () => {
      const group = await createEventGroup(
        { name: "Fest", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP", eventIds: [eventId] },
        creatorId,
      );
      const ticket = await createTicketType(group.id, {
        name: "GA",
        cost: 50,
        capacity: 5,
      });

      const cap = await checkTicketCapacity(ticket.id);
      expect(cap.capacity).toBe(5);
      expect(cap.sold).toBe(0);
      expect(cap.remaining).toBe(5);
    });

    it("should reflect bookings in ticket capacity", async () => {
      const group = await createEventGroup(
        { name: "Fest", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP", eventIds: [eventId] },
        creatorId,
      );
      const ticket = await createTicketType(group.id, {
        name: "GA",
        cost: 50,
        capacity: 5,
      });

      await createBooking(userId, { ticketTypeId: ticket.id, pricingTier: "standard" });

      const cap = await checkTicketCapacity(ticket.id);
      expect(cap.sold).toBe(1);
      expect(cap.remaining).toBe(4);
    });
  });
});
