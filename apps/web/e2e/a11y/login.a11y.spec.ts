import { test } from "@playwright/test";
import { runA11yCheck } from "./a11y-helpers.js";

test("login page has no critical a11y violations", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await runA11yCheck(page);
});
