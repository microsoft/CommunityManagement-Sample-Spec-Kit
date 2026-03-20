import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import DateQuickPicks from "@/components/events/DateQuickPicks";
import type { DateQuickPick } from "@acroyoga/shared/types/explorer";

describe("DateQuickPicks", () => {
  const onPick = vi.fn();

  it("renders all four quick pick buttons", () => {
    render(<DateQuickPicks activePick={null} onPick={onPick} />);
    expect(screen.getByText("This Week")).toBeDefined();
    expect(screen.getByText("This Weekend")).toBeDefined();
    expect(screen.getByText("This Month")).toBeDefined();
    expect(screen.getByText("Next 30 Days")).toBeDefined();
  });

  it("marks the active pick with aria-pressed", () => {
    render(<DateQuickPicks activePick="this-week" onPick={onPick} />);
    expect(screen.getByText("This Week").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("This Month").getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onPick when a button is clicked", () => {
    render(<DateQuickPicks activePick={null} onPick={onPick} />);
    fireEvent.click(screen.getByText("This Weekend"));
    expect(onPick).toHaveBeenCalledWith("this-weekend");
  });
});
