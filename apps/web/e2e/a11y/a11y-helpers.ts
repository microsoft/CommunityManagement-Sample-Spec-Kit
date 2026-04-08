import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Leaflet map container selector to exclude from axe scans.
 *
 * Leaflet is a third-party library with known accessibility limitations.
 * See: https://github.com/Leaflet/Leaflet/issues/7116
 * These are excluded from automated scans and audited manually.
 */
export const LEAFLET_SELECTOR = ".leaflet-container";

export interface A11yCheckOptions {
  /** Additional selectors to exclude from the scan (e.g. third-party widgets) */
  exclude?: string[];
}

/**
 * Run an axe-core accessibility check on the current page.
 * Scans for WCAG 2.1 AA violations at critical/serious impact levels.
 */
export async function runA11yCheck(page: Page, options: A11yCheckOptions = {}) {
  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);

  for (const selector of options.exclude ?? []) {
    builder.exclude(selector);
  }

  const results = await builder.analyze();
  const violations = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact ?? ""),
  );
  expect(violations).toEqual([]);
}
