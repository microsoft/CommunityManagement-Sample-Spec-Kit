import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EventCard } from "./index.web.js";
import type { EventCardData } from "./EventCard.js";

const event: EventCardData = {
  id: "evt-1",
  title: "Morning Jam",
  startDatetime: "2026-04-05T10:00:00Z",
  venueName: "Movement Lab",
  cityName: "Portland",
  category: "jam",
  skillLevel: "all_levels",
  cost: 0,
  currency: "USD",
  confirmedCount: 10,
  capacity: 30,
  posterImageUrl: null,
  userRsvpStatus: null,
};

describe("EventCard", () => {
  it("renders event title", () => {
    const html = renderToStaticMarkup(<EventCard event={event} />);
    expect(html).toContain("Morning Jam");
  });

  it("shows Free for zero cost", () => {
    const html = renderToStaticMarkup(<EventCard event={event} />);
    expect(html).toContain("Free");
  });

  it("formats paid events with currency", () => {
    const html = renderToStaticMarkup(<EventCard event={{ ...event, cost: 25 }} />);
    expect(html).toContain("25");
  });

  it("shows spots count", () => {
    const html = renderToStaticMarkup(<EventCard event={event} />);
    expect(html).toContain("10/30 spots");
  });

  it("shows RSVP status when present", () => {
    const html = renderToStaticMarkup(<EventCard event={{ ...event, userRsvpStatus: "confirmed" }} />);
    expect(html).toContain("confirmed");
  });

  it("has role=article for accessibility", () => {
    const html = renderToStaticMarkup(<EventCard event={event} />);
    expect(html).toContain('role="article"');
  });
});
