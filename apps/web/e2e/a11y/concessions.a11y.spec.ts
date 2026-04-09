import { test } from "@playwright/test";
import { runA11yCheck } from "./a11y-helpers.js";

test("concessions page has no critical a11y violations", async ({ page }) => {
  await page.goto("/concessions");
  await page.waitForLoadState("networkidle");
  await runA11yCheck(page);
});
