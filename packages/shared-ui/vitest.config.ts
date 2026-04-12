import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    root: resolve(import.meta.dirname!, "."),
    include: ["src/**/*.test.tsx", "src/**/*.a11y.test.tsx"],
  },
  esbuild: {
    jsx: "automatic",
  },
});
