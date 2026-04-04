/**
 * Shared test fixtures for Events Explorer E2E tests.
 *
 * Provides:
 * - `explorerPage` — a helper that intercepts `/api/events` and `/api/cities`
 *   with deterministic mock data so tests run without a database.
 */
import { test as base, type Page } from "@playwright/test";

/* ── Mock data ──────────────────────────────────────────────────── */

/** A minimal set of events spanning different categories and locations. */
export const MOCK_EVENTS = [
  {
    id: "evt-1",
    title: "Morning Jam Session",
    startDatetime: "2026-04-10T09:00:00.000Z",
    endDatetime: "2026-04-10T11:00:00.000Z",
    venueName: "Sunset Park",
    cityName: "Berlin",
    citySlug: "berlin",
    category: "jam",
    skillLevel: "all_levels",
    cost: 0,
    currency: "EUR",
    capacity: 30,
    confirmedCount: 12,
    interestedCount: 5,
    posterImageUrl: null,
    isExternal: false,
    venueLatitude: 52.52,
    venueLongitude: 13.405,
  },
  {
    id: "evt-2",
    title: "AcroYoga Workshop Lisbon",
    startDatetime: "2026-04-12T14:00:00.000Z",
    endDatetime: "2026-04-12T17:00:00.000Z",
    venueName: "Jardim da Estrela",
    cityName: "Lisbon",
    citySlug: "lisbon",
    category: "workshop",
    skillLevel: "intermediate",
    cost: 25,
    currency: "EUR",
    capacity: 20,
    confirmedCount: 18,
    interestedCount: 4,
    posterImageUrl: null,
    isExternal: false,
    venueLatitude: 38.7167,
    venueLongitude: -9.1395,
  },
  {
    id: "evt-3",
    title: "Beginner Class",
    startDatetime: "2026-04-10T18:00:00.000Z",
    endDatetime: "2026-04-10T20:00:00.000Z",
    venueName: "Community Center",
    cityName: "Berlin",
    citySlug: "berlin",
    category: "class",
    skillLevel: "beginner",
    cost: 15,
    currency: "EUR",
    capacity: 15,
    confirmedCount: 10,
    interestedCount: 3,
    posterImageUrl: null,
    isExternal: false,
    venueLatitude: 52.5,
    venueLongitude: 13.39,
  },
];

/** Mock cities that form a continent → country → city tree. */
export const MOCK_CITIES = [
  {
    id: "city-berlin",
    name: "Berlin",
    slug: "berlin",
    countryCode: "DE",
    countryName: "Germany",
    continentCode: "EU",
    continentName: "Europe",
    latitude: 52.52,
    longitude: 13.405,
  },
  {
    id: "city-lisbon",
    name: "Lisbon",
    slug: "lisbon",
    countryCode: "PT",
    countryName: "Portugal",
    continentCode: "EU",
    continentName: "Europe",
    latitude: 38.7167,
    longitude: -9.1395,
  },
];

/* ── API mock helper ────────────────────────────────────────────── */

/**
 * Intercept API calls on the given page so the Explorer renders
 * deterministic data without needing a real backend.
 */
export async function mockExplorerAPIs(page: Page) {
  await page.route("**/api/events*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        events: MOCK_EVENTS,
        total: MOCK_EVENTS.length,
        page: 1,
        pageSize: 100,
      }),
    }),
  );

  await page.route("**/api/cities*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ cities: MOCK_CITIES }),
    }),
  );
}

/* ── Extended test fixture ──────────────────────────────────────── */

export const test = base.extend<{ explorerPage: Page }>({
  explorerPage: async ({ page }, use) => {
    await mockExplorerAPIs(page);
    await page.goto("/events");
    /* Wait for loading to finish */
    await page.waitForSelector('[role="grid"], [role="tablist"]', {
      timeout: 15_000,
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
