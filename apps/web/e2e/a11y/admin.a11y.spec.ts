import { test } from "@playwright/test";
import { runA11yCheck } from "./a11y-helpers.js";

const ADMIN_ROUTES = [
  { name: "admin dashboard", path: "/admin" },
  { name: "admin teachers", path: "/admin/teachers" },
  { name: "admin permissions", path: "/admin/permissions" },
];

for (const { name, path } of ADMIN_ROUTES) {
  test(`${name} page has no critical a11y violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await runA11yCheck(page);
  });
}
