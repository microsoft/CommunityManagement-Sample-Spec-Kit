/**
 * Integration tests: Map & location hierarchy selection
 *
 * Ensures that:
 *  - buildLocationTree creates the correct continent → country → city structure
 *  - recomputeCounts rolls up event counts correctly at every level
 *  - findNode locates nodes by hierarchical path
 *  - filterTree narrows the tree by search term
 *  - getNodeBounds returns correct bounding boxes
 *  - recomputeCounts with a subset of events (filtered) gives accurate per-node counts
 *  - Multi-continent / multi-country seeds give correct totals at each hierarchy level
 */
import { describe, it, expect } from "vitest";
import type { CityWithContinent } from "@acroyoga/shared/types/explorer";
import type { EventSummary } from "@acroyoga/shared/types/events";
import {
  buildLocationTree,
  recomputeCounts,
  findNode,
  filterTree,
  getNodeBounds,
} from "@/lib/location-hierarchy";

// Helper to build a minimal CityWithContinent
function makeCity(overrides: Partial<CityWithContinent> = {}): CityWithContinent {
  return {
    id: overrides.id ?? "city-1",
    name: overrides.name ?? "Bristol",
    slug: overrides.slug ?? "bristol",
    countryCode: overrides.countryCode ?? "GB",
    countryName: overrides.countryName ?? "United Kingdom",
    continentCode: overrides.continentCode ?? "EU",
    continentName: overrides.continentName ?? "Europe",
    latitude: overrides.latitude ?? 51.45,
    longitude: overrides.longitude ?? -2.59,
    timezone: overrides.timezone ?? "Europe/London",
    activeEventCount: overrides.activeEventCount ?? 0,
  };
}

// Helper to build a minimal EventSummary
function makeEvent(citySlug: string, overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: overrides.id ?? `evt-${citySlug}-${Math.random()}`,
    title: overrides.title ?? `Event in ${citySlug}`,
    startDatetime: overrides.startDatetime ?? new Date().toISOString(),
    endDatetime: overrides.endDatetime ?? new Date().toISOString(),
    venueName: overrides.venueName ?? "Venue",
    cityName: overrides.cityName ?? citySlug,
    citySlug,
    category: overrides.category ?? "jam",
    skillLevel: overrides.skillLevel ?? "all_levels",
    cost: overrides.cost ?? 0,
    currency: overrides.currency ?? "GBP",
    capacity: overrides.capacity ?? 20,
    confirmedCount: overrides.confirmedCount ?? 0,
    interestedCount: overrides.interestedCount ?? 0,
    posterImageUrl: overrides.posterImageUrl ?? null,
    isExternal: overrides.isExternal ?? false,
  };
}

describe("Location hierarchy: buildLocationTree", () => {
  it("builds a single-level tree for one city", () => {
    const tree = buildLocationTree([makeCity()]);
    expect(tree).toHaveLength(1); // one continent
    expect(tree[0].type).toBe("continent");
    expect(tree[0].name).toBe("Europe");
    expect(tree[0].children).toHaveLength(1); // one country
    expect(tree[0].children[0].type).toBe("country");
    expect(tree[0].children[0].name).toBe("United Kingdom");
    expect(tree[0].children[0].children).toHaveLength(1); // one city
    expect(tree[0].children[0].children[0].type).toBe("city");
    expect(tree[0].children[0].children[0].name).toBe("Bristol");
  });

  it("groups multiple cities in the same country under one country node", () => {
    const cities = [
      makeCity({ id: "c1", name: "Bristol", slug: "bristol" }),
      makeCity({ id: "c2", name: "London", slug: "london" }),
    ];
    const tree = buildLocationTree(cities);
    const eu = tree.find((n) => n.code === "EU")!;
    const gb = eu.children.find((n) => n.code === "GB")!;
    expect(gb.children).toHaveLength(2);
  });

  it("groups cities from different countries under separate country nodes", () => {
    const cities = [
      makeCity({ id: "c1", name: "London", slug: "london", countryCode: "GB", countryName: "United Kingdom" }),
      makeCity({ id: "c2", name: "Paris", slug: "paris", countryCode: "FR", countryName: "France" }),
    ];
    const tree = buildLocationTree(cities);
    const eu = tree.find((n) => n.code === "EU")!;
    expect(eu.children).toHaveLength(2);
  });

  it("groups cities from different continents under separate continent nodes", () => {
    const cities = [
      makeCity({ id: "c1", name: "London", slug: "london", countryCode: "GB", countryName: "United Kingdom", continentCode: "EU", continentName: "Europe" }),
      makeCity({ id: "c2", name: "New York", slug: "new-york", countryCode: "US", countryName: "United States", continentCode: "NA", continentName: "North America" }),
    ];
    const tree = buildLocationTree(cities);
    expect(tree).toHaveLength(2);
    const continentCodes = tree.map((n) => n.code);
    expect(continentCodes).toContain("EU");
    expect(continentCodes).toContain("NA");
  });

  it("carries activeEventCount from city to initial tree node", () => {
    const tree = buildLocationTree([makeCity({ activeEventCount: 5 })]);
    const city = tree[0].children[0].children[0];
    expect(city.eventCount).toBe(5);
  });

  it("rolls up activeEventCount to country and continent nodes", () => {
    const cities = [
      makeCity({ id: "c1", name: "Bristol", slug: "bristol", activeEventCount: 3 }),
      makeCity({ id: "c2", name: "London", slug: "london", activeEventCount: 7 }),
    ];
    const tree = buildLocationTree(cities);
    const gb = tree[0].children[0];
    expect(gb.eventCount).toBe(10); // 3 + 7
    expect(tree[0].eventCount).toBe(10); // rolled up to continent
  });

  it("assigns correct IDs: continent/country/city", () => {
    const tree = buildLocationTree([makeCity()]);
    expect(tree[0].id).toBe("EU");
    expect(tree[0].children[0].id).toBe("EU/GB");
    expect(tree[0].children[0].children[0].id).toBe("EU/GB/bristol");
  });

  it("cities within a country are sorted alphabetically", () => {
    const cities = [
      makeCity({ id: "c1", name: "York", slug: "york" }),
      makeCity({ id: "c2", name: "Bristol", slug: "bristol" }),
      makeCity({ id: "c3", name: "Manchester", slug: "manchester" }),
    ];
    const tree = buildLocationTree(cities);
    const names = tree[0].children[0].children.map((n) => n.name);
    expect(names).toEqual(["Bristol", "Manchester", "York"]);
  });

  it("assigns null slug to continent and country nodes", () => {
    const tree = buildLocationTree([makeCity()]);
    expect(tree[0].slug).toBeNull();
    expect(tree[0].children[0].slug).toBeNull();
    expect(tree[0].children[0].children[0].slug).toBe("bristol");
  });

  it("handles empty city list gracefully", () => {
    const tree = buildLocationTree([]);
    expect(tree).toHaveLength(0);
  });

  it("assigns 'Global' continent name for 'XX' continent code", () => {
    const tree = buildLocationTree([
      makeCity({ continentCode: "XX", continentName: "Global", countryCode: "INT", countryName: "International" }),
    ]);
    expect(tree[0].name).toBe("Global");
  });
});

describe("Location hierarchy: recomputeCounts", () => {
  it("updates city event counts based on event list", () => {
    const tree = buildLocationTree([
      makeCity({ slug: "bristol", activeEventCount: 0 }),
    ]);
    const events = [makeEvent("bristol"), makeEvent("bristol")];
    const updated = recomputeCounts(tree, events);
    const city = updated[0].children[0].children[0];
    expect(city.eventCount).toBe(2);
  });

  it("rolls up counts to country level", () => {
    const tree = buildLocationTree([
      makeCity({ id: "c1", slug: "bristol", activeEventCount: 0 }),
      makeCity({ id: "c2", name: "London", slug: "london", activeEventCount: 0 }),
    ]);
    const events = [makeEvent("bristol"), makeEvent("london"), makeEvent("london")];
    const updated = recomputeCounts(tree, events);
    expect(updated[0].children[0].eventCount).toBe(3); // GB total
  });

  it("rolls up counts to continent level", () => {
    const tree = buildLocationTree([
      makeCity({ id: "c1", slug: "bristol" }),
      makeCity({ id: "c2", name: "London", slug: "london" }),
    ]);
    const events = [makeEvent("bristol"), makeEvent("london")];
    const updated = recomputeCounts(tree, events);
    expect(updated[0].eventCount).toBe(2); // EU continent
  });

  it("sets zero for cities with no matching events", () => {
    const tree = buildLocationTree([
      makeCity({ id: "c1", slug: "bristol", activeEventCount: 5 }),
    ]);
    const updated = recomputeCounts(tree, []); // no events
    expect(updated[0].children[0].children[0].eventCount).toBe(0);
  });

  it("correctly splits counts between two continents", () => {
    const tree = buildLocationTree([
      makeCity({ id: "c1", name: "London", slug: "london", countryCode: "GB", continentCode: "EU" }),
      makeCity({ id: "c2", name: "New York", slug: "new-york", countryCode: "US", continentCode: "NA" }),
    ]);
    const events = [
      makeEvent("london"),
      makeEvent("london"),
      makeEvent("new-york"),
    ];
    const updated = recomputeCounts(tree, events);
    const eu = updated.find((n) => n.code === "EU")!;
    const na = updated.find((n) => n.code === "NA")!;
    expect(eu.eventCount).toBe(2);
    expect(na.eventCount).toBe(1);
  });

  it("handles events for unknown city slugs gracefully (they don't crash)", () => {
    const tree = buildLocationTree([makeCity({ slug: "bristol" })]);
    const events = [makeEvent("unknown-city"), makeEvent("bristol")];
    const updated = recomputeCounts(tree, events);
    expect(updated[0].children[0].children[0].eventCount).toBe(1);
  });

  it("recomputing with filtered events reflects applied filter counts", () => {
    const tree = buildLocationTree([
      makeCity({ id: "c1", slug: "london", activeEventCount: 0 }),
      makeCity({ id: "c2", name: "Paris", slug: "paris", countryCode: "FR", countryName: "France", activeEventCount: 0 }),
    ]);
    const allEvents: EventSummary[] = [
      makeEvent("london", { category: "jam" }),
      makeEvent("london", { category: "workshop" }),
      makeEvent("paris", { category: "jam" }),
    ];

    // Filter: only jam events
    const jamEvents = allEvents.filter((e) => e.category === "jam");
    const updated = recomputeCounts(tree, jamEvents);

    const londonNode = findNode(updated, "EU/GB/london");
    const parisNode = findNode(updated, "EU/FR/paris");

    expect(londonNode?.eventCount).toBe(1);
    expect(parisNode?.eventCount).toBe(1);
    // GB country = 1 jam event
    const gbNode = findNode(updated, "EU/GB");
    expect(gbNode?.eventCount).toBe(1);
  });
});

describe("Location hierarchy: findNode", () => {
  const tree = buildLocationTree([
    makeCity({ id: "c1", name: "Bristol", slug: "bristol" }),
    makeCity({ id: "c2", name: "London", slug: "london" }),
    makeCity({ id: "c3", name: "Paris", slug: "paris", countryCode: "FR", countryName: "France" }),
  ]);

  it("finds a city node by its full hierarchical ID", () => {
    const node = findNode(tree, "EU/GB/bristol");
    expect(node).not.toBeNull();
    expect(node!.name).toBe("Bristol");
  });

  it("finds a country node by continent/country ID", () => {
    const node = findNode(tree, "EU/GB");
    expect(node).not.toBeNull();
    expect(node!.type).toBe("country");
    expect(node!.name).toBe("United Kingdom");
  });

  it("finds a continent node by continent ID", () => {
    const node = findNode(tree, "EU");
    expect(node).not.toBeNull();
    expect(node!.type).toBe("continent");
  });

  it("returns null for a non-existent node", () => {
    const node = findNode(tree, "EU/ZZ/nowhere");
    expect(node).toBeNull();
  });

  it("finds the correct city among multiple in the same country", () => {
    const london = findNode(tree, "EU/GB/london");
    const bristol = findNode(tree, "EU/GB/bristol");
    expect(london!.name).toBe("London");
    expect(bristol!.name).toBe("Bristol");
  });
});

describe("Location hierarchy: filterTree", () => {
  const tree = buildLocationTree([
    makeCity({ id: "c1", name: "Bristol", slug: "bristol" }),
    makeCity({ id: "c2", name: "London", slug: "london" }),
    makeCity({ id: "c3", name: "Paris", slug: "paris", countryCode: "FR", countryName: "France" }),
  ]);

  it("returns full tree when search term is empty", () => {
    const result = filterTree(tree, "");
    expect(result).toHaveLength(tree.length);
  });

  it("filters to matching city node", () => {
    const result = filterTree(tree, "Bristol");
    expect(result).toHaveLength(1); // EU continent retained
    const cities = result[0].children[0].children;
    expect(cities).toHaveLength(1);
    expect(cities[0].name).toBe("Bristol");
  });

  it("filter is case-insensitive", () => {
    const result = filterTree(tree, "london");
    const cities = result[0].children.flatMap((c) => c.children);
    expect(cities.some((c) => c.name === "London")).toBe(true);
  });

  it("matching a country name retains all children", () => {
    const result = filterTree(tree, "France");
    const fr = result[0].children.find((c) => c.code === "FR");
    expect(fr).toBeDefined();
    expect(fr!.children).toHaveLength(1); // Paris
  });

  it("returns empty when no match", () => {
    const result = filterTree(tree, "xyzzy");
    expect(result).toHaveLength(0);
  });
});

describe("Location hierarchy: getNodeBounds", () => {
  it("returns null for empty array", () => {
    expect(getNodeBounds([])).toBeNull();
  });

  it("returns bounding box for single city node", () => {
    const tree = buildLocationTree([makeCity({ latitude: 51.45, longitude: -2.59 })]);
    const bounds = getNodeBounds(tree[0].children[0].children); // city nodes
    expect(bounds).not.toBeNull();
    // bounds should wrap around the single city (with padding)
    const [[minLat, minLon], [maxLat, maxLon]] = bounds!;
    expect(minLat).toBeLessThan(51.45);
    expect(maxLat).toBeGreaterThan(51.45);
    expect(minLon).toBeLessThan(-2.59);
    expect(maxLon).toBeGreaterThan(-2.59);
  });

  it("wraps multiple cities in the bounding box", () => {
    const cities = [
      makeCity({ id: "c1", name: "Bristol", slug: "bristol", latitude: 51.45, longitude: -2.59 }),
      makeCity({ id: "c2", name: "London", slug: "london", latitude: 51.51, longitude: -0.13 }),
    ];
    const tree = buildLocationTree(cities);
    const bounds = getNodeBounds(tree[0].children[0].children);
    expect(bounds).not.toBeNull();
    const [[minLat, minLon], [maxLat, maxLon]] = bounds!;
    expect(minLat).toBeLessThan(51.45);
    expect(maxLat).toBeGreaterThan(51.51);
    expect(minLon).toBeLessThan(-2.59);
    expect(maxLon).toBeGreaterThan(-0.13);
  });
});

describe("Location hierarchy: multi-continent complete journey", () => {
  it("three continents, five countries, eight cities — all counts roll up correctly", () => {
    const cities: CityWithContinent[] = [
      // Europe
      makeCity({ id: "eu-gb-1", name: "London", slug: "london", countryCode: "GB", countryName: "United Kingdom", continentCode: "EU", activeEventCount: 3 }),
      makeCity({ id: "eu-gb-2", name: "Bristol", slug: "bristol", countryCode: "GB", countryName: "United Kingdom", continentCode: "EU", activeEventCount: 2 }),
      makeCity({ id: "eu-fr-1", name: "Paris", slug: "paris", countryCode: "FR", countryName: "France", continentCode: "EU", activeEventCount: 4 }),
      // North America
      makeCity({ id: "na-us-1", name: "New York", slug: "new-york", countryCode: "US", countryName: "United States", continentCode: "NA", activeEventCount: 6 }),
      makeCity({ id: "na-ca-1", name: "Toronto", slug: "toronto", countryCode: "CA", countryName: "Canada", continentCode: "NA", activeEventCount: 1 }),
      // Asia
      makeCity({ id: "as-jp-1", name: "Tokyo", slug: "tokyo", countryCode: "JP", countryName: "Japan", continentCode: "AS", activeEventCount: 5 }),
      makeCity({ id: "as-in-1", name: "Mumbai", slug: "mumbai", countryCode: "IN", countryName: "India", continentCode: "AS", activeEventCount: 2 }),
      makeCity({ id: "as-in-2", name: "Delhi", slug: "delhi", countryCode: "IN", countryName: "India", continentCode: "AS", activeEventCount: 3 }),
    ];

    const tree = buildLocationTree(cities);

    // Three continents
    expect(tree).toHaveLength(3);

    // Europe
    const eu = findNode(tree, "EU")!;
    expect(eu.eventCount).toBe(9); // 3 + 2 + 4
    const gb = findNode(tree, "EU/GB")!;
    expect(gb.eventCount).toBe(5); // 3 + 2
    const fr = findNode(tree, "EU/FR")!;
    expect(fr.eventCount).toBe(4);

    // North America
    const na = findNode(tree, "NA")!;
    expect(na.eventCount).toBe(7); // 6 + 1
    const us = findNode(tree, "NA/US")!;
    expect(us.eventCount).toBe(6);

    // Asia
    const as = findNode(tree, "AS")!;
    expect(as.eventCount).toBe(10); // 5 + 2 + 3
    const india = findNode(tree, "AS/IN")!;
    expect(india.eventCount).toBe(5); // 2 + 3

    // Individual cities
    expect(findNode(tree, "EU/GB/london")!.eventCount).toBe(3);
    expect(findNode(tree, "EU/GB/bristol")!.eventCount).toBe(2);
    expect(findNode(tree, "AS/IN/mumbai")!.eventCount).toBe(2);
    expect(findNode(tree, "AS/IN/delhi")!.eventCount).toBe(3);
  });

  it("recomputeCounts with a city filter gives correct hierarchy totals", () => {
    const cities: CityWithContinent[] = [
      makeCity({ id: "eu-gb-1", name: "London", slug: "london", countryCode: "GB", continentCode: "EU" }),
      makeCity({ id: "eu-gb-2", name: "Bristol", slug: "bristol", countryCode: "GB", continentCode: "EU" }),
      makeCity({ id: "eu-fr-1", name: "Paris", slug: "paris", countryCode: "FR", countryName: "France", continentCode: "EU" }),
    ];
    const tree = buildLocationTree(cities);

    // 5 London events, 3 Bristol events, 2 Paris events
    const events: EventSummary[] = [
      ...Array.from({ length: 5 }, (_, i) => makeEvent("london", { id: `lon-${i}` })),
      ...Array.from({ length: 3 }, (_, i) => makeEvent("bristol", { id: `brs-${i}` })),
      ...Array.from({ length: 2 }, (_, i) => makeEvent("paris", { id: `par-${i}` })),
    ];

    const updated = recomputeCounts(tree, events);

    expect(findNode(updated, "EU/GB/london")!.eventCount).toBe(5);
    expect(findNode(updated, "EU/GB/bristol")!.eventCount).toBe(3);
    expect(findNode(updated, "EU/GB")!.eventCount).toBe(8);
    expect(findNode(updated, "EU/FR/paris")!.eventCount).toBe(2);
    expect(findNode(updated, "EU/FR")!.eventCount).toBe(2);
    expect(findNode(updated, "EU")!.eventCount).toBe(10);
  });
});
