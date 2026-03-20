import { describe, it, expect, vi } from "vitest";
import { extractMapMarkers } from "@/lib/explorer-api";
import type { EventSummaryWithCoords } from "@acroyoga/shared/types/events";

function makeCoordEvent(overrides: Partial<EventSummaryWithCoords> = {}): EventSummaryWithCoords {
  return {
    id: "e1",
    title: "Jam Session",
    category: "jam",
    skillLevel: "all_levels",
    startDatetime: "2025-06-15T10:00:00Z",
    endDatetime: "2025-06-15T12:00:00Z",
    venueName: "Park",
    cityName: "Berlin",
    citySlug: "berlin",
    cost: 0,
    currency: "EUR",
    capacity: 30,
    confirmedCount: 10,
    interestedCount: 5,
    isExternal: false,
    isNew: false,
    isUpdated: false,
    posterImageUrl: null,
    venueLatitude: 52.52,
    venueLongitude: 13.405,
    ...overrides,
  };
}

describe("extractMapMarkers", () => {
  it("converts events with coords to markers", () => {
    const events = [makeCoordEvent()];
    const markers = extractMapMarkers(events);
    expect(markers).toHaveLength(1);
    expect(markers[0].latitude).toBe(52.52);
    expect(markers[0].longitude).toBe(13.405);
    expect(markers[0].category).toBe("jam");
  });

  it("filters out events without coordinates", () => {
    const events = [makeCoordEvent({ venueLatitude: null, venueLongitude: null })];
    const markers = extractMapMarkers(events);
    expect(markers).toHaveLength(0);
  });

  it("filters out events with zero coordinates", () => {
    const events = [makeCoordEvent({ venueLatitude: 0, venueLongitude: 0 })];
    const markers = extractMapMarkers(events);
    expect(markers).toHaveLength(0);
  });

  it("handles multiple events", () => {
    const events = [
      makeCoordEvent({ id: "e1", venueLatitude: 52.52, venueLongitude: 13.405 }),
      makeCoordEvent({ id: "e2", venueLatitude: 48.85, venueLongitude: 2.35, cityName: "Paris" }),
      makeCoordEvent({ id: "e3", venueLatitude: null }),
    ];
    const markers = extractMapMarkers(events);
    expect(markers).toHaveLength(2);
  });

  it("maps all required fields", () => {
    const markers = extractMapMarkers([makeCoordEvent()]);
    const m = markers[0];
    expect(m).toHaveProperty("eventId", "e1");
    expect(m).toHaveProperty("title", "Jam Session");
    expect(m).toHaveProperty("date", "2025-06-15T10:00:00Z");
    expect(m).toHaveProperty("venueName", "Park");
    expect(m).toHaveProperty("cityName", "Berlin");
  });
});
