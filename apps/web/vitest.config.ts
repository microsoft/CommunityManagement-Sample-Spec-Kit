import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: [],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@acroyoga/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@acroyoga/shared-ui": path.resolve(__dirname, "../../packages/shared-ui/src"),
      "@acroyoga/tokens": path.resolve(__dirname, "../../packages/tokens/src"),
    },
  },
});
