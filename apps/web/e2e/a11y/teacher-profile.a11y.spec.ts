import { test } from "@playwright/test";
import { runA11yCheck } from "./a11y-helpers.js";

test("teacher profile page has no critical a11y violations", async ({ page }) => {
  await page.goto("/teachers");
  await page.waitForLoadState("networkidle");
  const teacherCard = page.locator('[role="article"]').first();
  const count = await teacherCard.count();
  if (count > 0) {
    await teacherCard.click();
    await page.waitForLoadState("networkidle");
    await runA11yCheck(page);
  } else {
    await runA11yCheck(page);
  }
});
