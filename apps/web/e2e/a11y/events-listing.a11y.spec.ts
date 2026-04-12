import { test } from "@playwright/test";
import { runA11yCheck, LEAFLET_SELECTOR } from "./a11y-helpers.js";

test("events listing page has no critical a11y violations", async ({ page }) => {
  await page.goto("/events");
  await page.waitForLoadState("networkidle");
  await runA11yCheck(page, { exclude: [LEAFLET_SELECTOR] });
});
