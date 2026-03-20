import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
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

describe("Explorer responsive layout", () => {
  it("renders 2-column grid layout structure", () => {
    const { container } = render(<ExplorerShell events={[]} coordEvents={[]} />);
    const grid = container.querySelector(".explorer-shell__grid");
    expect(grid).toBeTruthy();
    // Should contain sidebar, calendar, and map panels
    expect(container.querySelector(".explorer-shell__sidebar")).toBeTruthy();
    expect(container.querySelector(".explorer-shell__calendar")).toBeTruthy();
    expect(container.querySelector(".explorer-shell__map")).toBeTruthy();
  });

  it("has mobile tab bar in DOM (hidden on desktop via CSS)", () => {
    const { container } = render(<ExplorerShell events={[]} coordEvents={[]} />);
    const tabBar = container.querySelector(".explorer-shell__tabs");
    expect(tabBar).toBeTruthy();
    // Tab bar has 3 children
    const tabs = tabBar!.querySelectorAll(".explorer-shell__tab");
    expect(tabs.length).toBe(3);
  });

  it("applies media query breakpoints via embedded style", () => {
    const { container } = render(<ExplorerShell events={[]} coordEvents={[]} />);
    const styleTag = container.querySelector("style");
    expect(styleTag).toBeTruthy();
    const css = styleTag!.textContent ?? "";
    // Mobile breakpoint
    expect(css).toContain("max-width: 640px");
  });

  it("includes touch-target tab styles", () => {
    const { container } = render(<ExplorerShell events={[]} coordEvents={[]} />);
    const css = container.querySelector("style")?.textContent ?? "";
    // Tab buttons have padding rules for adequate touch targets
    expect(css).toContain(".explorer-shell__tab");
    expect(css).toContain("padding");
  });
});
