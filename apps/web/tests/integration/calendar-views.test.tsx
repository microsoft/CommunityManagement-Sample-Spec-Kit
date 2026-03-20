import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/events/explorer",
}));

vi.mock("next/dynamic", () => ({
  default: () => function DynamicStub() {
    return <div data-testid="map-panel-stub" />;
  },
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ cities: [] }),
});

vi.mock("@/components/events/EventCard", () => ({
  default: ({ event }: any) => (
    <div data-testid={`event-card-${event.id}`} data-category={event.category}>
      {event.title}
    </div>
  ),
}));

import ExplorerShell from "@/components/events/ExplorerShell";
import type { EventSummary } from "@acroyoga/shared/types/events";

function makeEvent(id: string, cat: string, date: string): EventSummary {
  return {
    id,
    title: `${cat} Event ${id}`,
    slug: `${cat}-event-${id}`,
    category: cat as any,
    skillLevel: "all_levels",
    startDatetime: date,
    endDatetime: date,
    venueName: "Studio",
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
  };
}

describe("Calendar month view integration", () => {
  const events = [
    makeEvent("e1", "jam", "2025-01-15T10:00:00Z"),
    makeEvent("e2", "workshop", "2025-01-16T14:00:00Z"),
  ];

  it("renders month grid with navigation buttons", () => {
    render(<ExplorerShell events={events} coordEvents={[]} />);
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /next month/i })).toBeDefined();
    expect(screen.getByRole("grid")).toBeDefined();
  });

  it("renders day cells in the month grid", () => {
    render(<ExplorerShell events={events} coordEvents={[]} />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells.length).toBeGreaterThanOrEqual(28);
  });
});
