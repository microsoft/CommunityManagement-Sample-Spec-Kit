import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { expandOccurrences, parseRecurrenceRule } from "@/lib/recurrence/expander";
import {
  createOverride,
  getOverridesForEvent,
  getOverride,
  updateOverride,
  deleteOverride,
} from "@/lib/recurrence/overrides";
import { listOccurrences, applySeriesEdit } from "@/lib/recurrence/service";
import fs from "fs";
import path from "path";

let db: PGlite;
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

describe("Recurrence Engine", () => {
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

    // Create a recurring weekly event
    const rule = JSON.stringify({
      frequency: "weekly",
      interval: 1,
      daysOfWeek: ["MO"],
    });
    const startDate = futureDate(1);
    const endDate = futureDate(2);
    const result = await db.query<{ id: string }>(
      `INSERT INTO events (title, description, start_datetime, end_datetime, venue_id, capacity, created_by, recurrence_rule, category, skill_level)
       VALUES ('Weekly Class', 'A weekly class', $1, $2, $3, 30, $4, $5, 'class', 'all_levels') RETURNING id`,
      [startDate, endDate, venueId, creatorId, rule],
    );
    eventId = result.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("parseRecurrenceRule", () => {
    it("should parse a weekly rule", () => {
      const rule = parseRecurrenceRule(
        JSON.stringify({ frequency: "weekly", interval: 1, daysOfWeek: ["MO"] }),
      );
      expect(rule.frequency).toBe("weekly");
      expect(rule.interval).toBe(1);
      expect(rule.daysOfWeek).toEqual(["MO"]);
    });

    it("should parse a daily rule with endDate", () => {
      const rule = parseRecurrenceRule(
        JSON.stringify({ frequency: "daily", interval: 2, endDate: "2025-12-31" }),
      );
      expect(rule.frequency).toBe("daily");
      expect(rule.interval).toBe(2);
      expect(rule.endDate).toBe("2025-12-31");
    });

    it("should parse a monthly rule with occurrenceCount", () => {
      const rule = parseRecurrenceRule(
        JSON.stringify({ frequency: "monthly", interval: 1, occurrenceCount: 6 }),
      );
      expect(rule.frequency).toBe("monthly");
      expect(rule.occurrenceCount).toBe(6);
    });
  });

  describe("expandOccurrences", () => {
    it("should expand weekly occurrences within the horizon", async () => {
      const rule = JSON.stringify({ frequency: "weekly", interval: 1, daysOfWeek: ["MO"] });
      const start = futureDate(1);
      const end = futureDate(1);
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 28); // 4 weeks

      const occurrences = await expandOccurrences(eventId, rule, start, end, from, to);
      expect(occurrences.length).toBeGreaterThanOrEqual(1);
      expect(occurrences.length).toBeLessThanOrEqual(5);
      for (const occ of occurrences) {
        expect(occ.date).toBeDefined();
        expect(occ.startDatetime).toBeDefined();
        expect(occ.endDatetime).toBeDefined();
      }
    });

    it("should respect occurrenceCount limit", async () => {
      const rule = JSON.stringify({ frequency: "daily", interval: 1, occurrenceCount: 3 });
      const start = futureDate(1);
      const end = futureDate(1);
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 365);

      const occurrences = await expandOccurrences(eventId, rule, start, end, from, to);
      expect(occurrences.length).toBeLessThanOrEqual(3);
    });

    it("should respect endDate limit", async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const rule = JSON.stringify({
        frequency: "daily",
        interval: 1,
        endDate: endDate.toISOString().slice(0, 10),
      });
      const start = futureDate(1);
      const end = futureDate(1);
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 365);

      const occurrences = await expandOccurrences(eventId, rule, start, end, from, to);
      for (const occ of occurrences) {
        expect(new Date(occ.date).getTime()).toBeLessThanOrEqual(endDate.getTime() + 86400000);
      }
    });
  });

  describe("Occurrence Overrides", () => {
    it("should create and retrieve an override", async () => {
      const override = await createOverride(eventId, {
        occurrenceDate: "2025-03-10",
        overrideType: "cancelled",
      }, creatorId);
      expect(override.event_id).toBe(eventId);
      expect(override.override_type).toBe("cancelled");

      const retrieved = await getOverride(eventId, "2025-03-10");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(override.id);
    });

    it("should create a modified override with fields", async () => {
      const override = await createOverride(eventId, {
        occurrenceDate: "2025-03-17",
        overrideType: "modified",
        modifiedFields: { title: "Special Class", capacity: 50 },
      }, creatorId);
      expect(override.override_type).toBe("modified");
      expect((override.modified_fields as Record<string, unknown>).title).toBe("Special Class");
    });

    it("should list all overrides for an event", async () => {
      await createOverride(eventId, { occurrenceDate: "2025-03-10", overrideType: "cancelled" }, creatorId);
      await createOverride(eventId, { occurrenceDate: "2025-03-17", overrideType: "modified" }, creatorId);

      const overrides = await getOverridesForEvent(eventId);
      expect(overrides.length).toBe(2);
    });

    it("should update an override", async () => {
      await createOverride(eventId, {
        occurrenceDate: "2025-03-10",
        overrideType: "cancelled",
      }, creatorId);

      const updated = await updateOverride(eventId, "2025-03-10", {
        overrideType: "modified",
        modifiedFields: { title: "Rescheduled" },
      });
      expect(updated!.override_type).toBe("modified");
    });

    it("should delete an override", async () => {
      await createOverride(eventId, {
        occurrenceDate: "2025-03-10",
        overrideType: "cancelled",
      }, creatorId);

      const deleted = await deleteOverride(eventId, "2025-03-10");
      expect(deleted).toBe(true);

      const check = await getOverride(eventId, "2025-03-10");
      expect(check).toBeNull();
    });

    it("should return false when deleting non-existent override", async () => {
      const result = await deleteOverride(eventId, "2099-01-01");
      expect(result).toBe(false);
    });
  });

  describe("listOccurrences (service)", () => {
    it("should return occurrences for a recurring event", async () => {
      const occurrences = await listOccurrences(eventId);
      expect(occurrences.length).toBeGreaterThan(0);
      for (const occ of occurrences) {
        expect(occ.eventId).toBe(eventId);
        expect(occ.isCancelled).toBe(false);
      }
    });

    it("should exclude cancelled occurrences", async () => {
      const occurrences = await listOccurrences(eventId);
      const firstDate = occurrences[0]?.date;
      if (!firstDate) return;

      await createOverride(eventId, { occurrenceDate: firstDate, overrideType: "cancelled" }, creatorId);

      const updated = await listOccurrences(eventId);
      expect(updated.find((o) => o.date === firstDate)).toBeUndefined();
    });

    it("should apply modified fields to occurrences", async () => {
      const occurrences = await listOccurrences(eventId);
      const firstDate = occurrences[0]?.date;
      if (!firstDate) return;

      await createOverride(eventId, {
        occurrenceDate: firstDate,
        overrideType: "modified",
        modifiedFields: { title: "Special Edition" },
      }, creatorId);

      const updated = await listOccurrences(eventId);
      const modified = updated.find((o) => o.date === firstDate);
      expect(modified).toBeDefined();
      expect(modified!.title).toBe("Special Edition");
      expect(modified!.isModified).toBe(true);
    });

    it("should return empty for non-recurring event", async () => {
      const result = await db.query<{ id: string }>(
        `INSERT INTO events (title, description, start_datetime, end_datetime, venue_id, capacity, created_by, category, skill_level)
         VALUES ('One-off', 'Single event', $1, $2, $3, 10, $4, 'social', 'all_levels') RETURNING id`,
        [futureDate(5), futureDate(6), venueId, creatorId],
      );
      const occurrences = await listOccurrences(result.rows[0].id);
      expect(occurrences.length).toBe(0);
    });

    it("should return empty for non-existent event", async () => {
      const occurrences = await listOccurrences("00000000-0000-0000-0000-000000000099");
      expect(occurrences.length).toBe(0);
    });
  });

  describe("applySeriesEdit", () => {
    it("should apply 'all' scope edit to base event", async () => {
      await applySeriesEdit(eventId, {
        scope: "all",
        changes: { title: "Updated Weekly Class" },
      });

      const result = await db.query<{ title: string }>(
        "SELECT title FROM events WHERE id = $1",
        [eventId],
      );
      expect(result.rows[0].title).toBe("Updated Weekly Class");
    });

    it("should apply 'this' scope edit as override", async () => {
      const occurrences = await listOccurrences(eventId);
      const firstDate = occurrences[0]?.date;
      if (!firstDate) return;

      await applySeriesEdit(eventId, {
        scope: "this",
        occurrenceDate: firstDate,
        changes: { title: "Modified This One" },
      }, creatorId);

      const override = await getOverride(eventId, firstDate);
      expect(override).not.toBeNull();
      expect(override!.override_type).toBe("modified");
    });

    it("should apply 'thisAndFuture' by truncating recurrence", async () => {
      const occurrences = await listOccurrences(eventId);
      if (occurrences.length < 2) return;
      const splitDate = occurrences[1].date;

      await applySeriesEdit(eventId, {
        scope: "thisAndFuture",
        occurrenceDate: splitDate,
        changes: {},
      });

      const result = await db.query<{ recurrence_rule: string }>(
        "SELECT recurrence_rule FROM events WHERE id = $1",
        [eventId],
      );
      const rule = JSON.parse(result.rows[0].recurrence_rule);
      expect(rule.endDate).toBeDefined();
    });
  });
});
