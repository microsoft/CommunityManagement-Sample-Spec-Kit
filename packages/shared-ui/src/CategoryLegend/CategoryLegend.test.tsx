import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryLegend } from "./index.web.js";
import type { CategoryColorConfig } from "@acroyoga/shared/types/explorer";

const mockCategories: CategoryColorConfig[] = [
  { category: "jam", tokenName: "--color-category-jam", labelKey: "category.jam" },
  { category: "workshop", tokenName: "--color-category-workshop", labelKey: "category.workshop" },
  { category: "class", tokenName: "--color-category-class", labelKey: "category.class" },
  { category: "festival", tokenName: "--color-category-festival", labelKey: "category.festival" },
  { category: "social", tokenName: "--color-category-social", labelKey: "category.social" },
  { category: "retreat", tokenName: "--color-category-retreat", labelKey: "category.retreat" },
  { category: "teacher_training", tokenName: "--color-category-training", labelKey: "category.teacherTraining" },
];

describe("CategoryLegend", () => {
  it("renders all 7 categories", () => {
    const html = renderToStaticMarkup(
      <CategoryLegend categories={mockCategories} enabledCategories={[]} onToggle={() => {}} />
    );
    expect(html).toContain("jam");
    expect(html).toContain("workshop");
    expect(html).toContain("class");
    expect(html).toContain("festival");
    expect(html).toContain("social");
    expect(html).toContain("retreat");
    expect(html).toContain("teacher training");
  });

  it("renders with correct color tokens", () => {
    const html = renderToStaticMarkup(
      <CategoryLegend categories={mockCategories} enabledCategories={[]} onToggle={() => {}} />
    );
    expect(html).toContain("--color-category-jam");
    expect(html).toContain("--color-category-workshop");
  });

  it("renders enabled state correctly", () => {
    const html = renderToStaticMarkup(
      <CategoryLegend categories={mockCategories} enabledCategories={["jam"]} onToggle={() => {}} />
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("renders all as active when enabledCategories is empty", () => {
    const html = renderToStaticMarkup(
      <CategoryLegend categories={mockCategories} enabledCategories={[]} onToggle={() => {}} />
    );
    // All should be "true" since empty means all active
    const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
    expect(pressedCount).toBe(7);
  });
});
