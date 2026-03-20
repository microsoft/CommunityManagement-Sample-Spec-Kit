import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    root: resolve(import.meta.dirname!, "."),
    include: ["__tests__/**/*.test.ts"],
    hookTimeout: 60_000,
  },
});
