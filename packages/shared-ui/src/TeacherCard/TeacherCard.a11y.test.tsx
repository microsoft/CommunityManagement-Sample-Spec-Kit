// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { TeacherCard } from "./index.web.js";

const mockTeacher = {
  id: "teacher-1",
  user_name: "Jane Smith",
  specialties: ["base", "coach"],
  badge_status: "verified" as const,
  aggregate_rating: "4.8",
  review_count: 23,
  bio: "Experienced AcroYoga teacher based in London.",
};

describe("TeacherCard axe", () => {
  it("has no a11y violations", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<TeacherCard teacher={mockTeacher} />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (no rating, no bio)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <TeacherCard teacher={{ ...mockTeacher, aggregate_rating: null, bio: null, review_count: 0 }} />,
    );
    await expectNoA11yViolations(div);
  });
});
