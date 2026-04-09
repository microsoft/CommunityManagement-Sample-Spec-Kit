import { test } from "@playwright/test";
import { runA11yCheck } from "./a11y-helpers.js";

const SETTINGS_ROUTES = [
  { name: "settings root", path: "/settings" },
  { name: "account settings", path: "/settings/account" },
  { name: "notification settings", path: "/settings/notifications" },
  { name: "privacy settings", path: "/settings/privacy" },
  { name: "teacher settings", path: "/settings/teacher" },
];

for (const { name, path } of SETTINGS_ROUTES) {
  test(`${name} page has no critical a11y violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await runA11yCheck(page);
  });
}
