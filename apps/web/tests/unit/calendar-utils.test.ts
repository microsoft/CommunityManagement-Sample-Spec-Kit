import { describe, it, expect } from "vitest";
import {
  buildMonthGrid,
  buildWeekSlots,
  getDateRangeForView,
  isToday,
  computeOverflow,
  groupEventsByDate,
  navigateMonth,
} from "@/lib/calendar-utils";
import type { EventSummary } from "@acroyoga/shared/types/events";

function makeEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: "e1",
    title: "Test Event",
    startDatetime: "2026-03-15T10:00:00Z",
    endDatetime: "2026-03-15T12:00:00Z",
    venueName: "Studio",
    cityName: "Bristol",
    citySlug: "bristol",
    category: "jam",
    skillLevel: "all_levels",
    cost: 0,
    currency: "GBP",
    capacity: 20,
    confirmedCount: 5,
    interestedCount: 2,
    posterImageUrl: null,
    isExternal: false,
    ...overrides,
  };
}

describe("buildMonthGrid", () => {
  it("returns correct year and month", () => {
    const grid = buildMonthGrid(2026, 2, []); // March (0-indexed)
    expect(grid.year).toBe(2026);
    expect(grid.month).toBe(2);
  });

  it("has 4-6 weeks", () => {
    const grid = buildMonthGrid(2026, 2, []);
    expect(grid.weeks.length).toBeGreaterThanOrEqual(4);
    expect(grid.weeks.length).toBeLessThanOrEqual(6);
  });

  it("each week has 7 days", () => {
    const grid = buildMonthGrid(2026, 2, []);
    for (const week of grid.weeks) {
      expect(week.days).toHaveLength(7);
    }
  });

  it("assigns events to correct day", () => {
    const events = [makeEvent({ startDatetime: "2026-03-15T10:00:00Z" })];
    const grid = buildMonthGrid(2026, 2, events);
    const march15 = grid.weeks
      .flatMap((w) => w.days)
      .find((d) => d.date.getDate() === 15 && d.isCurrentMonth);
    expect(march15?.events).toHaveLength(1);
  });

  it("handles empty days", () => {
    const grid = buildMonthGrid(2026, 2, []);
    const day = grid.weeks[0].days[0];
    expect(day.events).toHaveLength(0);
    expect(day.overflowCount).toBe(0);
  });

  it("computes overflow for more than 3 events", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `e${i}`, startDatetime: "2026-03-15T10:00:00Z" })
    );
    const grid = buildMonthGrid(2026, 2, events);
    const march15 = grid.weeks
      .flatMap((w) => w.days)
      .find((d) => d.date.getDate() === 15 && d.isCurrentMonth);
    expect(march15?.events).toHaveLength(3);
    expect(march15?.overflowCount).toBe(2);
  });

  it("marks isCurrentMonth correctly", () => {
    const grid = buildMonthGrid(2026, 2, []);
    const allDays = grid.weeks.flatMap((w) => w.days);
    const marchDays = allDays.filter((d) => d.isCurrentMonth);
    expect(marchDays.length).toBe(31); // March has 31 days
  });
});

describe("buildWeekSlots", () => {
  it("produces 48 slots for 30-min intervals", () => {
    const slots = buildWeekSlots(new Date(2026, 2, 16), []);
    expect(slots).toHaveLength(48);
  });

  it("first slot starts at 00:00", () => {
    const slots = buildWeekSlots(new Date(2026, 2, 16), []);
    expect(slots[0].startTime).toBe("00:00");
    expect(slots[0].endTime).toBe("00:30");
  });

  it("assigns events to correct time slot", () => {
    const events = [makeEvent({ startDatetime: "2026-03-16T10:15:00Z" })];
    const slots = buildWeekSlots(new Date(2026, 2, 16), events);
    const slot1000 = slots.find((s) => s.startTime === "10:00");
    expect(slot1000?.events).toHaveLength(1);
  });
});

describe("getDateRangeForView", () => {
  const ref = new Date(2026, 2, 15); // March 15, 2026

  it("month view returns full month range", () => {
    const range = getDateRangeForView("month", ref);
    expect(range.dateFrom).toBe("2026-03-01");
    expect(range.dateTo).toBe("2026-03-31");
  });

  it("week view returns Monday-Sunday range", () => {
    const range = getDateRangeForView("week", ref);
    expect(range.dateFrom).toMatch(/2026-03-/);
    expect(range.dateTo).toMatch(/2026-03-/);
  });

  it("list view returns 30-day range", () => {
    const range = getDateRangeForView("list", ref);
    expect(range.dateFrom).toBe("2026-03-15");
    expect(range.dateTo).toBe("2026-04-14");
  });
});

describe("isToday", () => {
  it("returns true for today", () => {
    expect(isToday(new Date())).toBe(true);
  });

  it("returns false for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
});

describe("computeOverflow", () => {
  it("returns 0 when events <= max", () => {
    expect(computeOverflow(2, 3)).toBe(0);
  });

  it("returns overflow count when events > max", () => {
    expect(computeOverflow(5, 3)).toBe(2);
  });
});

describe("groupEventsByDate", () => {
  it("groups events by date", () => {
    const events = [
      makeEvent({ id: "e1", startDatetime: "2026-03-15T10:00:00Z" }),
      makeEvent({ id: "e2", startDatetime: "2026-03-15T14:00:00Z" }),
      makeEvent({ id: "e3", startDatetime: "2026-03-16T10:00:00Z" }),
    ];
    const groups = groupEventsByDate(events);
    expect(groups).toHaveLength(2);
    expect(groups[0].events).toHaveLength(2);
    expect(groups[1].events).toHaveLength(1);
  });

  it("sorts events by start time within group", () => {
    const events = [
      makeEvent({ id: "e2", startDatetime: "2026-03-15T14:00:00Z" }),
      makeEvent({ id: "e1", startDatetime: "2026-03-15T10:00:00Z" }),
    ];
    const groups = groupEventsByDate(events);
    expect(groups[0].events[0].id).toBe("e1");
    expect(groups[0].events[1].id).toBe("e2");
  });
});

describe("navigateMonth", () => {
  it("goes to next month", () => {
    const result = navigateMonth(2026, 2, "next");
    expect(result).toEqual({ year: 2026, month: 3 });
  });

  it("goes to previous month", () => {
    const result = navigateMonth(2026, 0, "prev");
    expect(result).toEqual({ year: 2025, month: 11 });
  });
});
