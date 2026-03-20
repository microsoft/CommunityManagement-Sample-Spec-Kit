import { defineConfig } from "vitest/config";
import nativePath from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = nativePath.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: [],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "threads",
    server: {
      deps: {
        external: [/^node:/, "path", "fs", "util", "crypto"],
      },
    },
  },
  resolve: {
    alias: {
      path: "node:path",
      fs: "node:fs",
      util: "node:util",
      crypto: "node:crypto",
      "@": nativePath.resolve(__dirname, "./src"),
      "@acroyoga/shared": nativePath.resolve(__dirname, "../../packages/shared/src"),
      "@acroyoga/shared-ui": nativePath.resolve(__dirname, "../../packages/shared-ui/src"),
      "@acroyoga/tokens": nativePath.resolve(__dirname, "../../packages/tokens/src"),
    },
  },
});
