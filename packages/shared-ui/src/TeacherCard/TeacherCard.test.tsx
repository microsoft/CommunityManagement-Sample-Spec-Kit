import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TeacherCard } from "./index.web.js";
import type { TeacherCardData } from "./TeacherCard.js";

const teacher: TeacherCardData = {
  id: "t-1",
  user_name: "Elena Rodriguez",
  specialties: ["hand_to_hand", "therapeutic"],
  badge_status: "verified",
  aggregate_rating: "4.8",
  review_count: 42,
  bio: "Experienced teacher.",
};

describe("TeacherCard", () => {
  it("renders teacher name", () => {
    const html = renderToStaticMarkup(<TeacherCard teacher={teacher} />);
    expect(html).toContain("Elena Rodriguez");
  });

  it("renders specialties", () => {
    const html = renderToStaticMarkup(<TeacherCard teacher={teacher} />);
    expect(html).toContain("hand to hand");
    expect(html).toContain("therapeutic");
  });

  it("renders rating and review count", () => {
    const html = renderToStaticMarkup(<TeacherCard teacher={teacher} />);
    expect(html).toContain("★ 4.8");
    expect(html).toContain("42 reviews");
  });

  it("renders bio", () => {
    const html = renderToStaticMarkup(<TeacherCard teacher={teacher} />);
    expect(html).toContain("Experienced teacher.");
  });

  it("hides rating when null", () => {
    const noRating = { ...teacher, aggregate_rating: null, review_count: 0 };
    const html = renderToStaticMarkup(<TeacherCard teacher={noRating} />);
    expect(html).not.toContain("★");
  });
});
