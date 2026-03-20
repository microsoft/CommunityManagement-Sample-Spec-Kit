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
    view: "month" as const,
    events: [makeEvent()],
    dateFrom: "2025-01-01",
    onViewChange: vi.fn(),
    onDateChange: vi.fn(),
  };

  it("renders view switcher tabs", () => {
    render(<CalendarPanel {...defaultProps} />);
    expect(screen.getByRole("tab", { name: /month/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /week/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /list/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /agenda/i })).toBeDefined();
  });

  it("calls onViewChange when a different tab is clicked", () => {
    const onViewChange = vi.fn();
    render(<CalendarPanel {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /week/i }));
    expect(onViewChange).toHaveBeenCalledWith("week");
  });

  it("renders month navigation buttons in month view", () => {
    render(<CalendarPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /next month/i })).toBeDefined();
  });

  it("renders in list view", () => {
    render(<CalendarPanel {...defaultProps} view="list" />);
    expect(screen.getByTestId("event-card-e1")).toBeDefined();
  });

  it("renders in agenda view grouping by date", () => {
    render(<CalendarPanel {...defaultProps} view="agenda" />);
    // Agenda view uses details/summary expandable sections; event cards are inside
    const details = document.querySelectorAll("details");
    expect(details.length).toBeGreaterThanOrEqual(1);
  });
});
