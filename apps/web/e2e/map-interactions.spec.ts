/**
 * E2E: Map Interactions (Spec 010 T037 / Spec 013 T018)
 *
 * Verifies the map panel renders, displays markers / bubbles for the
 * mocked events, and supports basic interactions (zoom, count toggle).
 */
import { test, expect } from "./fixtures";

test.describe("Map interactions", () => {
  test("renders the map region", async ({ explorerPage: page }) => {
    const mapRegion = page.locator('[role="region"][aria-label="Event map"]');
    await expect(mapRegion).toBeVisible();

    /* Leaflet map container should be present */
    const leafletMap = mapRegion.locator(".leaflet-container");
    await expect(leafletMap).toBeVisible();
  });

  test("shows the map tile layer", async ({ explorerPage: page }) => {
    /* The tile layer renders <img> tiles from OpenStreetMap */
    const tiles = page.locator(".leaflet-tile-container img");
    /* At least one tile should be loaded (or loading) */
    await expect(tiles.first()).toBeAttached({ timeout: 10_000 });
  });

  test("toggle event counts on map button works", async ({
    explorerPage: page,
  }) => {
    const toggle = page.getByLabel("Toggle event counts on map");
    await expect(toggle).toBeVisible();

    /* Initially unpressed */
    const initialState = await toggle.getAttribute("aria-pressed");

    /* Click to toggle */
    await toggle.click();
    const afterClick = await toggle.getAttribute("aria-pressed");
    expect(afterClick).not.toBe(initialState);

    /* Click again to revert */
    await toggle.click();
    const afterSecondClick = await toggle.getAttribute("aria-pressed");
    expect(afterSecondClick).toBe(initialState);
  });

  test("map has accessible label with marker count", async ({
    explorerPage: page,
  }) => {
    /* The map container role="img" has a computed label like "Map showing 3 events" */
    const mapImg = page.locator('[role="img"][aria-label*="Map showing"]');
    await expect(mapImg).toBeVisible();
    const label = await mapImg.getAttribute("aria-label");
    expect(label).toMatch(/Map showing \d+ events?/);
  });
});
