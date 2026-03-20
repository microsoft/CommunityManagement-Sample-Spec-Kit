import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import MapMarkerPopup from "@/components/events/MapMarkerPopup";
import type { MapMarkerData } from "@acroyoga/shared/types/explorer";

const marker: MapMarkerData = {
  eventId: "e1",
  latitude: 52.52,
  longitude: 13.405,
  category: "workshop",
  title: "Intro to AcroYoga",
  date: "2025-06-15T10:00:00Z",
  venueName: "Tempelhof Park",
  cityName: "Berlin",
};

describe("MapMarkerPopup", () => {
  it("renders the event title", () => {
    render(<MapMarkerPopup marker={marker} />);
    expect(screen.getByText("Intro to AcroYoga")).toBeDefined();
  });

  it("renders venue and city", () => {
    render(<MapMarkerPopup marker={marker} />);
    expect(screen.getByText(/Tempelhof Park/)).toBeDefined();
    expect(screen.getByText(/Berlin/)).toBeDefined();
  });

  it("renders category as text", () => {
    render(<MapMarkerPopup marker={marker} />);
    expect(screen.getByText(/workshop/i)).toBeDefined();
  });

  it("renders the formatted date", () => {
    render(<MapMarkerPopup marker={marker} />);
    // Should show some date representation
    const dateText = screen.getByText(/2025|Jun|June/);
    expect(dateText).toBeDefined();
  });
});
