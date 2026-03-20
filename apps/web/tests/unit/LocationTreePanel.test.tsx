import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

import LocationTreePanel from "@/components/events/LocationTreePanel";

describe("LocationTreePanel", () => {
  const defaultProps = {
    selectedPath: [],
    onSelect: vi.fn(),
  };

  it("renders a search input after loading", async () => {
    render(<LocationTreePanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText("Filter locations")).toBeDefined();
    });
  });

  it("renders the panel container", () => {
    const { container } = render(<LocationTreePanel {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });
});
