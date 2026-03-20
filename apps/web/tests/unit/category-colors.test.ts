import { describe, it, expect } from "vitest";
import {
  CATEGORY_COLORS,
  ALL_CATEGORIES,
  getCategoryColor,
  getCategoryTokenName,
  getCategoryLabel,
} from "@/lib/category-colors";

describe("category-colors", () => {
  it("defines 7 category colors", () => {
    expect(CATEGORY_COLORS).toHaveLength(7);
  });

  it("ALL_CATEGORIES contains all 7 categories", () => {
    expect(ALL_CATEGORIES).toHaveLength(7);
    expect(ALL_CATEGORIES).toContain("jam");
    expect(ALL_CATEGORIES).toContain("workshop");
    expect(ALL_CATEGORIES).toContain("teacher_training");
  });

  it("getCategoryColor returns CSS var for known category", () => {
    expect(getCategoryColor("jam")).toBe("var(--color-category-jam)");
    expect(getCategoryColor("workshop")).toBe("var(--color-category-workshop)");
    expect(getCategoryColor("retreat")).toBe("var(--color-category-retreat)");
  });

  it("getCategoryColor returns fallback for unknown category", () => {
    expect(getCategoryColor("unknown" as any)).toBe("var(--color-surface-muted)");
  });

  it("getCategoryTokenName returns token name", () => {
    expect(getCategoryTokenName("festival")).toBe("--color-category-festival");
    expect(getCategoryTokenName("teacher_training")).toBe("--color-category-training");
  });

  it("getCategoryLabel returns label key", () => {
    expect(getCategoryLabel("jam")).toBe("category.jam");
    expect(getCategoryLabel("teacher_training")).toBe("category.teacherTraining");
  });

  it("maps categories to correct tokens", () => {
    const expected: Record<string, string> = {
      jam: "--color-category-jam",
      workshop: "--color-category-workshop",
      class: "--color-category-class",
      festival: "--color-category-festival",
      social: "--color-category-social",
      retreat: "--color-category-retreat",
      teacher_training: "--color-category-training",
    };

    for (const config of CATEGORY_COLORS) {
      expect(config.tokenName).toBe(expected[config.category]);
    }
  });
});
