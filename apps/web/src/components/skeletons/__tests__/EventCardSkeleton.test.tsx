import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EventCardSkeleton from "../EventCardSkeleton";

describe("EventCardSkeleton", () => {
  it("renders with aria-busy=true", () => {
    render(<EventCardSkeleton />);
    const el = screen.getByLabelText("Loading…");
    expect(el).toBeDefined();
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("does not render visible text content", () => {
    const { container } = render(<EventCardSkeleton />);
    const text = container.textContent?.trim() ?? "";
    expect(text).toBe("");
  });
});
