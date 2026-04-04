import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Events Explorer E2E tests.
 *
 * Uses route interception (page.route) to mock API responses, so no real
 * database or backend is required.  The Next.js dev server is started
 * automatically via the `webServer` option.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",

  /* Fail the build on CI if test.only is left in the source */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,

  /* Single worker keeps things deterministic */
  workers: 1,

  /* Reporter */
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:3000",
    /* Capture trace on first retry (CI only) */
    trace: "on-first-retry",
    /* Screenshot on failure */
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Start the Next.js server before running tests.
     CI already has a production build, so use `next start` for speed.
     Local dev uses `next dev` for hot-reload convenience. */
  webServer: {
    command: process.env.CI
      ? "npx next start --port 3000"
      : "npx next dev --port 3000",
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    cwd: ".",
  },
});
