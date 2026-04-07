import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TeacherCardSkeleton from "../TeacherCardSkeleton";

describe("TeacherCardSkeleton", () => {
  it("renders with aria-busy=true", () => {
    render(<TeacherCardSkeleton />);
    const el = screen.getByLabelText("Loading…");
    expect(el).toBeDefined();
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("does not render visible text content", () => {
    const { container } = render(<TeacherCardSkeleton />);
    const text = container.textContent?.trim() ?? "";
    expect(text).toBe("");
  });
});
