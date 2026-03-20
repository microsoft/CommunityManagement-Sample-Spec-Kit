import { describe, it, expect } from "vitest";
import {
  buildLocationTree,
  recomputeCounts,
  findNode,
  getNodeBounds,
  filterTree,
  sortAlphabetically,
} from "@/lib/location-hierarchy";
import type { CityWithContinent } from "@acroyoga/shared/types/explorer";

function makeCity(overrides: Partial<CityWithContinent> = {}): CityWithContinent {
  return {
    id: "c1",
    name: "Bristol",
    slug: "bristol",
    countryName: "United Kingdom",
    countryCode: "GB",
    latitude: 51.45,
    longitude: -2.58,
    timezone: "Europe/London",
    activeEventCount: 5,
    continentCode: "EU",
    continentName: "Europe",
    ...overrides,
  };
}

describe("buildLocationTree", () => {
  it("groups cities by continent and country", () => {
    const cities = [
      makeCity({ id: "c1", name: "Bristol", slug: "bristol", countryCode: "GB", continentCode: "EU" }),
      makeCity({ id: "c2", name: "London", slug: "london", countryCode: "GB", continentCode: "EU" }),
      makeCity({ id: "c3", name: "Tokyo", slug: "tokyo", countryName: "Japan", countryCode: "JP", continentCode: "AS" }),
    ];
    const tree = buildLocationTree(cities);

    expect(tree).toHaveLength(2); // Asia, Europe
    const europe = tree.find((n) => n.code === "EU");
    expect(europe).toBeTruthy();
    expect(europe!.children).toHaveLength(1); // UK
    expect(europe!.children[0].children).toHaveLength(2); // Bristol, London
  });

  it("sets correct node types", () => {
    const cities = [makeCity()];
    const tree = buildLocationTree(cities);
    expect(tree[0].type).toBe("continent");
    expect(tree[0].children[0].type).toBe("country");
    expect(tree[0].children[0].children[0].type).toBe("city");
  });

  it("builds hierarchical IDs", () => {
    const cities = [makeCity()];
    const tree = buildLocationTree(cities);
    expect(tree[0].id).toBe("EU");
    expect(tree[0].children[0].id).toBe("EU/GB");
    expect(tree[0].children[0].children[0].id).toBe("EU/GB/bristol");
  });

  it("rolls up event counts", () => {
    const cities = [
      makeCity({ slug: "bristol", activeEventCount: 5 }),
      makeCity({ id: "c2", slug: "london", name: "London", activeEventCount: 10 }),
    ];
    const tree = buildLocationTree(cities);
    const europe = tree.find((n) => n.code === "EU")!;
    expect(europe.eventCount).toBe(15);
    expect(europe.children[0].eventCount).toBe(15); // UK
  });

  it("returns empty array for empty input", () => {
    expect(buildLocationTree([])).toEqual([]);
  });

  it("sorts nodes alphabetically", () => {
    const cities = [
      makeCity({ name: "Zurich", slug: "zurich", countryName: "Switzerland", countryCode: "CH" }),
      makeCity({ id: "c2", name: "Athens", slug: "athens", countryName: "Greece", countryCode: "GR" }),
    ];
    const tree = buildLocationTree(cities);
    const europe = tree.find((n) => n.code === "EU")!;
    expect(europe.children[0].name).toBe("Greece");
    expect(europe.children[1].name).toBe("Switzerland");
  });
});

describe("recomputeCounts", () => {
  it("sets city count from matching events", () => {
    const tree = buildLocationTree([
      makeCity({ slug: "bristol", activeEventCount: 99 }),
    ]);
    const events = [
      { citySlug: "bristol" },
      { citySlug: "bristol" },
    ] as { citySlug: string }[];
    const result = recomputeCounts(tree, events as any);
    const city = result[0].children[0].children[0];
    expect(city.eventCount).toBe(2);
  });

  it("rolls up to parent nodes", () => {
    const tree = buildLocationTree([
      makeCity({ slug: "bristol", activeEventCount: 1 }),
      makeCity({ id: "c2", name: "London", slug: "london", activeEventCount: 1 }),
    ]);
    const events = [
      { citySlug: "bristol" },
      { citySlug: "london" },
      { citySlug: "london" },
    ] as { citySlug: string }[];
    const result = recomputeCounts(tree, events as any);
    const country = result[0].children[0];
    expect(country.eventCount).toBe(3); // 1 bristol + 2 london
  });
});

describe("findNode", () => {
  it("finds a node by hierarchical id", () => {
    const tree = buildLocationTree([makeCity()]);
    const node = findNode(tree, "EU/GB/bristol");
    expect(node).toBeTruthy();
    expect(node!.name).toBe("Bristol");
  });

  it("returns null when not found", () => {
    const tree = buildLocationTree([makeCity()]);
    expect(findNode(tree, "NA/US/sf")).toBeNull();
  });
});

describe("getNodeBounds", () => {
  it("returns bounding box with padding", () => {
    const tree = buildLocationTree([
      makeCity({ slug: "bristol", latitude: 51.45, longitude: -2.58 }),
      makeCity({ id: "c2", name: "London", slug: "london", latitude: 51.51, longitude: -0.13 }),
    ]);
    const country = tree[0].children[0];
    const bounds = getNodeBounds(country.children);
    expect(bounds).toBeTruthy();
    // south should be ~50.45 (51.45 - 1 pad)
    expect(bounds![0][0]).toBeCloseTo(50.45, 1);
  });

  it("returns null for nodes without coordinates", () => {
    const node = { id: "test", type: "continent" as const, name: "Test", slug: null, code: "T", eventCount: 0, latitude: null, longitude: null, children: [] };
    expect(getNodeBounds([node])).toBeNull();
  });
});

describe("filterTree", () => {
  const tree = buildLocationTree([
    makeCity({ name: "Bristol", slug: "bristol", countryCode: "GB", continentCode: "EU" }),
    makeCity({ id: "c2", name: "Tokyo", slug: "tokyo", countryName: "Japan", countryCode: "JP", continentCode: "AS" }),
  ]);

  it("returns full tree for empty search", () => {
    expect(filterTree(tree, "")).toEqual(tree);
  });

  it("filters by city name", () => {
    const result = filterTree(tree, "tokyo");
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("AS");
  });

  it("filters by country name", () => {
    const result = filterTree(tree, "United Kingdom");
    expect(result).toHaveLength(1);
  });

  it("filters by continent name", () => {
    const result = filterTree(tree, "Europe");
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("EU");
  });

  it("returns empty for no matches", () => {
    const result = filterTree(tree, "Atlantis");
    expect(result).toHaveLength(0);
  });
});

describe("sortAlphabetically", () => {
  it("sorts nodes by name", () => {
    const nodes = [
      { id: "b", type: "continent" as const, name: "Beta", slug: null, code: "B", eventCount: 0, latitude: null, longitude: null, children: [] },
      { id: "a", type: "continent" as const, name: "Alpha", slug: null, code: "A", eventCount: 0, latitude: null, longitude: null, children: [] },
    ];
    const sorted = sortAlphabetically(nodes);
    expect(sorted[0].name).toBe("Alpha");
    expect(sorted[1].name).toBe("Beta");
  });
});
