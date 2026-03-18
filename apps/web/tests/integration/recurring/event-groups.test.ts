import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  createEventGroup,
  getEventGroup,
  listEventGroups,
  updateEventGroup,
  deleteEventGroup,
  getGroupMembers,
} from "@/lib/event-groups/service";
import {
  createTicketType,
  getTicketType,
  listTicketTypes,
  updateTicketType,
  deleteTicketType,
  getTicketTypeAvailability,
  getTicketCoveredEvents,
} from "@/lib/event-groups/ticket-types";
import fs from "fs";
import path from "path";

let db: PGlite;
let creatorId: string;
let venueId: string;
let eventId1: string;
let eventId2: string;

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

describe("Event Groups & Ticket Types", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('creator@test.com', 'Creator') RETURNING id",
    );
    creatorId = r1.rows[0].id;

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
    eventId1 = e1.rows[0].id;

    const e2 = await db.query<{ id: string }>(
      `INSERT INTO events (title, description, start_datetime, end_datetime, venue_id, capacity, created_by, category, skill_level)
       VALUES ('Event 2', 'Day 2', $1, $2, $3, 100, $4, 'festival', 'all_levels') RETURNING id`,
      [futureDate(11), futureDate(12), venueId, creatorId],
    );
    eventId2 = e2.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("Event Group CRUD", () => {
    it("should create an event group", async () => {
      const group = await createEventGroup(
        {
          name: "Summer Festival",
          type: "festival",
          startDate: "2025-07-01",
          endDate: "2025-07-03",
          currency: "GBP",
          eventIds: [eventId1, eventId2],
        },
        creatorId,
      );
      expect(group.name).toBe("Summer Festival");
      expect(group.type).toBe("festival");
      expect(group.currency).toBe("GBP");
    });

    it("should get an event group by id", async () => {
      const group = await createEventGroup(
        { name: "Fest", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP" },
        creatorId,
      );
      const found = await getEventGroup(group.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe("Fest");
    });

    it("should return null for non-existent group", async () => {
      const found = await getEventGroup("00000000-0000-0000-0000-000000000099");
      expect(found).toBeNull();
    });

    it("should list event groups", async () => {
      await createEventGroup(
        { name: "F1", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP" },
        creatorId,
      );
      await createEventGroup(
        { name: "C1", type: "combo", startDate: "2025-08-01", endDate: "2025-08-03", currency: "USD" },
        creatorId,
      );

      const all = await listEventGroups();
      expect(all.length).toBe(2);

      const festivals = await listEventGroups({ type: "festival" });
      expect(festivals.length).toBe(1);
      expect(festivals[0].type).toBe("festival");
    });

    it("should update an event group", async () => {
      const group = await createEventGroup(
        { name: "Orig", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP" },
        creatorId,
      );
      const updated = await updateEventGroup(group.id, { name: "Updated" });
      expect(updated!.name).toBe("Updated");
    });

    it("should update event group members", async () => {
      const group = await createEventGroup(
        { name: "Fest", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP", eventIds: [eventId1] },
        creatorId,
      );
      let members = await getGroupMembers(group.id);
      expect(members.length).toBe(1);

      await updateEventGroup(group.id, { eventIds: [eventId1, eventId2] });
      members = await getGroupMembers(group.id);
      expect(members.length).toBe(2);
    });

    it("should delete an event group", async () => {
      const group = await createEventGroup(
        { name: "Del", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP" },
        creatorId,
      );
      const deleted = await deleteEventGroup(group.id);
      expect(deleted).toBe(true);
      const found = await getEventGroup(group.id);
      expect(found).toBeNull();
    });

    it("should return false when deleting non-existent group", async () => {
      const result = await deleteEventGroup("00000000-0000-0000-0000-000000000099");
      expect(result).toBe(false);
    });
  });

  describe("Ticket Types", () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await createEventGroup(
        { name: "Festival", type: "festival", startDate: "2025-07-01", endDate: "2025-07-03", currency: "GBP", eventIds: [eventId1, eventId2] },
        creatorId,
      );
      groupId = group.id;
    });

    it("should create a ticket type", async () => {
      const ticket = await createTicketType(groupId, {
        name: "Weekend Pass",
        cost: 100,
        capacity: 500,
        coversAllEvents: true,
      });
      expect(ticket.name).toBe("Weekend Pass");
      expect(parseFloat(String(ticket.cost))).toBe(100);
    });

    it("should create a ticket type with concession cost", async () => {
      const ticket = await createTicketType(groupId, {
        name: "Student Pass",
        cost: 100,
        concessionCost: 50,
        capacity: 100,
      });
      expect(parseFloat(String(ticket.concession_cost))).toBe(50);
    });

    it("should create a partial-coverage ticket", async () => {
      const ticket = await createTicketType(groupId, {
        name: "Day 1 Only",
        cost: 60,
        capacity: 200,
        coversAllEvents: false,
        eventIds: [eventId1],
      });
      expect(ticket.covers_all_events).toBe(false);

      const covered = await getTicketCoveredEvents(ticket.id);
      expect(covered).toContain(eventId1);
      expect(covered).not.toContain(eventId2);
    });

    it("should list ticket types for a group", async () => {
      await createTicketType(groupId, { name: "T1", cost: 50, capacity: 100 });
      await createTicketType(groupId, { name: "T2", cost: 100, capacity: 50 });

      const tickets = await listTicketTypes(groupId);
      expect(tickets.length).toBe(2);
    });

    it("should update a ticket type", async () => {
      const ticket = await createTicketType(groupId, { name: "Old", cost: 50, capacity: 100 });
      const updated = await updateTicketType(ticket.id, { name: "New", cost: 75 });
      expect(updated!.name).toBe("New");
      expect(parseFloat(String(updated!.cost))).toBe(75);
    });

    it("should delete a ticket type", async () => {
      const ticket = await createTicketType(groupId, { name: "Del", cost: 50, capacity: 100 });
      const deleted = await deleteTicketType(ticket.id);
      expect(deleted).toBe(true);
      const found = await getTicketType(ticket.id);
      expect(found).toBeNull();
    });

    it("should get ticket type availability", async () => {
      const ticket = await createTicketType(groupId, { name: "Avail", cost: 50, capacity: 10 });
      const avail = await getTicketTypeAvailability(ticket.id);
      expect(avail).not.toBeNull();
      expect(avail!.capacity).toBe(10);
      expect(avail!.sold).toBe(0);
      expect(avail!.available).toBe(10);
    });

    it("should resolve covers_all_events", async () => {
      const ticket = await createTicketType(groupId, {
        name: "All Events",
        cost: 100,
        capacity: 500,
        coversAllEvents: true,
      });
      const covered = await getTicketCoveredEvents(ticket.id);
      expect(covered).toContain(eventId1);
      expect(covered).toContain(eventId2);
    });

    it("should return false when deleting non-existent ticket", async () => {
      const result = await deleteTicketType("00000000-0000-0000-0000-000000000099");
      expect(result).toBe(false);
    });
  });
});
