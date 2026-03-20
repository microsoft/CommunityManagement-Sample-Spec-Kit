import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import CalendarPanel from "@/components/events/CalendarPanel";
import type { EventSummary } from "@acroyoga/shared/types/events";

vi.mock("@/components/events/EventCard", () => ({
  default: ({ event }: { event: EventSummary }) => (
    <div data-testid={`event-card-${event.id}`}>{event.title}</div>
  ),
}));

function makeEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: "e1",
    title: "Test Event",
    slug: "test-event",
    category: "jam",
    skillLevel: "all_levels",
    startDatetime: new Date(2025, 0, 15, 10, 0).toISOString(),
    endDatetime: new Date(2025, 0, 15, 12, 0).toISOString(),
    venueName: "Studio A",
    cityName: "Berlin",
    countryCode: "DE",
    cost: 0,
    currency: "EUR",
    capacity: 20,
    confirmedCount: 5,
    interestedCount: 2,
    isNew: false,
    isUpdated: false,
    posterImageUrl: null,
    ...overrides,
  };
}

describe("CalendarPanel", () => {
  const defaultProps = {
    events: [makeEvent()],
    dateFrom: "2025-01-01",
    onDateChange: vi.fn(),
    onDayClick: vi.fn(),
  };

  it("renders month navigation buttons", () => {
    render(<CalendarPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /next month/i })).toBeDefined();
  });

  it("renders the month grid with day cells", () => {
    render(<CalendarPanel {...defaultProps} />);
    expect(screen.getByRole("grid")).toBeDefined();
    const cells = screen.getAllByRole("gridcell");
    expect(cells.length).toBeGreaterThanOrEqual(28);
  });
});
