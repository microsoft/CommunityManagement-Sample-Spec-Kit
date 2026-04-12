import { test } from "@playwright/test";
import { runA11yCheck } from "./a11y-helpers.js";

test("bookings page has no critical a11y violations", async ({ page }) => {
  await page.goto("/bookings");
  await page.waitForLoadState("networkidle");
  await runA11yCheck(page);
});
