import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    projects: ["apps/*/vitest.config.ts", "packages/*/vitest.config.ts"],
  },
});
