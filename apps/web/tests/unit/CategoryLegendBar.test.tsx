import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import CategoryLegendBar from "@/components/events/CategoryLegendBar";
import type { EventCategory } from "@acroyoga/shared/types/events";

describe("CategoryLegendBar", () => {
  const onToggle = vi.fn();

  it("renders category legend items", () => {
    render(<CategoryLegendBar enabledCategories={["jam", "workshop"]} onToggle={onToggle} />);
    // Should render at least some category buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onToggle when a category is clicked", () => {
    render(<CategoryLegendBar enabledCategories={[]} onToggle={onToggle} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onToggle).toHaveBeenCalled();
  });
});
