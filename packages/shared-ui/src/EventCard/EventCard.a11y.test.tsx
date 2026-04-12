// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { EventCard } from "./index.web.js";

const mockEvent = {
  id: "evt-1",
  title: "AcroYoga Jam Session",
  startDatetime: "2025-06-15T10:00:00Z",
  venueName: "Yoga Studio",
  cityName: "London",
  category: "jam",
  skillLevel: "all_levels",
  cost: 0,
  currency: "GBP",
  confirmedCount: 5,
  capacity: 20,
  posterImageUrl: null,
};

describe("EventCard axe", () => {
  it("has no a11y violations", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<EventCard event={mockEvent} />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (with poster image)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <EventCard event={{ ...mockEvent, posterImageUrl: "https://example.com/img.jpg" }} />,
    );
    await expectNoA11yViolations(div);
  });
});
