import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileSkeleton from "../ProfileSkeleton";

describe("ProfileSkeleton", () => {
  it("renders with aria-busy=true", () => {
    render(<ProfileSkeleton />);
    const el = screen.getByLabelText("Loading…");
    expect(el).toBeDefined();
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("does not render visible text content", () => {
    const { container } = render(<ProfileSkeleton />);
    const text = container.textContent?.trim() ?? "";
    expect(text).toBe("");
  });
});
