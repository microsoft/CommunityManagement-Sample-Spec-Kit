import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/events/explorer",
}));

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ cities: [] }),
});
global.fetch = mockFetch;

// Mock next/dynamic to render MapPanel directly
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>) => {
    // Return a stub for SSR-disabled dynamic imports
    return function DynamicStub(props: any) {
      return <div data-testid="map-panel-stub" />;
    };
  },
}));

import ExplorerShell from "@/components/events/ExplorerShell";
import type { EventSummary, EventSummaryWithCoords } from "@acroyoga/shared/types/events";

function makeEvent(id: string, category = "jam"): EventSummary {
  return {
    id,
    title: `Event ${id}`,
    slug: `event-${id}`,
    category: category as any,
    skillLevel: "all_levels",
    startDatetime: "2025-06-15T10:00:00Z",
    endDatetime: "2025-06-15T12:00:00Z",
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
  };
}

describe("ExplorerShell – cross-panel interaction", () => {
  const events = [makeEvent("e1", "jam"), makeEvent("e2", "workshop")];
  const coordEvents: EventSummaryWithCoords[] = [];

  it("renders the header with category legend and quick picks", () => {
    render(<ExplorerShell events={events} coordEvents={coordEvents} />);
    expect(screen.getByText("This Week")).toBeDefined();
    expect(screen.getByText("This Weekend")).toBeDefined();
  });

  it("renders mobile tab bar navigation", () => {
    const { container } = render(<ExplorerShell events={events} coordEvents={coordEvents} />);
    const nav = container.querySelector("nav.explorer-shell__tabs");
    expect(nav).toBeTruthy();
    const buttons = nav!.querySelectorAll("button");
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe("Calendar");
    expect(buttons[1].textContent).toBe("Map");
    expect(buttons[2].textContent).toBe("Filters");
  });

  it("renders the map panel stub", () => {
    render(<ExplorerShell events={events} coordEvents={coordEvents} />);
    expect(screen.getByTestId("map-panel-stub")).toBeDefined();
  });
});
