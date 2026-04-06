import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DirectoryCardSkeleton from "../DirectoryCardSkeleton";

describe("DirectoryCardSkeleton", () => {
  it("renders with aria-busy=true", () => {
    render(<DirectoryCardSkeleton />);
    const el = screen.getByLabelText("Loading…");
    expect(el).toBeDefined();
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("does not render visible text content", () => {
    const { container } = render(<DirectoryCardSkeleton />);
    const text = container.textContent?.trim() ?? "";
    expect(text).toBe("");
  });
});
