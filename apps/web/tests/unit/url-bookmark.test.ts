import { describe, it, expect, vi } from "vitest";
import { mapFiltersToQuery } from "@/lib/explorer-api";
import type { ExplorerFilterState } from "@acroyoga/shared/types/explorer";

function defaultFilters(overrides: Partial<ExplorerFilterState> = {}): ExplorerFilterState {
  return {
    categories: [],
    location: null,
    dateFrom: null,
    dateTo: null,
    view: "month",
    skillLevel: null,
    status: [],
    q: null,
    page: 1,
    ...overrides,
  };
}

describe("URL bookmark fidelity", () => {
  it("serializes empty filters to minimal query", () => {
    const query = mapFiltersToQuery(defaultFilters());
    expect(query.category).toBeUndefined();
    expect(query.city).toBeUndefined();
    expect(query.dateFrom).toBeUndefined();
    expect(query.dateTo).toBeUndefined();
    expect(query.page).toBe(1);
  });

  it("serializes single category filter", () => {
    const query = mapFiltersToQuery(defaultFilters({ categories: ["jam"] }));
    expect(query.category).toBe("jam");
  });

  it("serializes location filter", () => {
    const query = mapFiltersToQuery(defaultFilters({ location: "berlin" }));
    expect(query.city).toBe("berlin");
  });

  it("serializes date range", () => {
    const query = mapFiltersToQuery(defaultFilters({
      dateFrom: "2025-01-01",
      dateTo: "2025-01-31",
    }));
    expect(query.dateFrom).toBe("2025-01-01");
    expect(query.dateTo).toBe("2025-01-31");
  });

  it("serializes skill level", () => {
    const query = mapFiltersToQuery(defaultFilters({ skillLevel: "beginner" }));
    expect(query.skillLevel).toBe("beginner");
  });

  it("serializes pagination", () => {
    const query = mapFiltersToQuery(defaultFilters({ page: 3 }));
    expect(query.page).toBe(3);
  });

  it("omits categories when all 7 are selected", () => {
    const all = ["jam", "workshop", "class", "festival", "social", "retreat", "teacher_training"] as any[];
    const query = mapFiltersToQuery(defaultFilters({ categories: all }));
    expect(query.category).toBeUndefined();
  });
});
