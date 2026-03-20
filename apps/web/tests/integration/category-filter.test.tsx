import { describe, it, expect, vi, beforeEach } from "vitest";
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

import ExplorerShell from "@/components/events/ExplorerShell";
import type { EventSummary } from "@acroyoga/shared/types/events";

function makeEvent(id: string, cat: string): EventSummary {
  return {
    id,
    title: `Event ${id}`,
    slug: `event-${id}`,
    category: cat as any,
    skillLevel: "all_levels",
    startDatetime: "2025-01-15T10:00:00Z",
    endDatetime: "2025-01-15T12:00:00Z",
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

describe("Category filter integration", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  const events = [
    makeEvent("e1", "jam"),
    makeEvent("e2", "workshop"),
    makeEvent("e3", "class"),
  ];

  it("clicking a category toggle updates URL with categories param", () => {
    render(<ExplorerShell events={events} coordEvents={[]} />);
    // Find any category toggle button from the legend
    const buttons = screen.getAllByRole("button");
    // Find a button that looks like a category (has aria-pressed)
    const categoryBtn = buttons.find((b) => b.getAttribute("aria-pressed") !== null);
    if (categoryBtn) {
      fireEvent.click(categoryBtn);
      expect(mockPush).toHaveBeenCalled();
      const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1][0] as string;
      expect(lastCall).toContain("categories=");
    }
  });

  it("renders category legend with toggle buttons", () => {
    render(<ExplorerShell events={events} coordEvents={[]} />);
    const pressedButtons = screen.getAllByRole("button").filter(
      (b) => b.getAttribute("aria-pressed") !== null
    );
    // At minimum the 7 category toggles + 4 quick-pick buttons have aria-pressed
    expect(pressedButtons.length).toBeGreaterThanOrEqual(7);
  });
});
