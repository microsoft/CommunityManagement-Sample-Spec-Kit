// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { CategoryLegend } from "./index.web.js";
import type { CategoryColorConfig } from "@acroyoga/shared/types/explorer";
import type { EventCategory } from "@acroyoga/shared/types/events";

const CATEGORIES: CategoryColorConfig[] = [
  { category: "jam" as EventCategory, tokenName: "--color-category-jam", labelKey: "jam" },
  { category: "workshop" as EventCategory, tokenName: "--color-category-workshop", labelKey: "workshop" },
  { category: "class" as EventCategory, tokenName: "--color-category-class", labelKey: "class" },
];

describe("CategoryLegend axe", () => {
  it("has no a11y violations", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <CategoryLegend
        categories={CATEGORIES}
        enabledCategories={["jam" as EventCategory, "workshop" as EventCategory]}
        onToggle={() => undefined}
      />,
    );
    await expectNoA11yViolations(div);
  });
});
