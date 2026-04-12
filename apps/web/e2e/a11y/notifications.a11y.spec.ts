import { test } from "@playwright/test";
import { runA11yCheck } from "./a11y-helpers.js";

test("notifications page has no critical a11y violations", async ({ page }) => {
  await page.goto("/notifications");
  await page.waitForLoadState("networkidle");
  await runA11yCheck(page);
});
