import type { StorybookConfig } from "storybook/internal/types";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../src/components/**/*.stories.@(ts|tsx)",
    "../../../packages/shared-ui/**/*.stories.@(ts|tsx)",
  ],
  framework: "@storybook/react-vite",
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  viteFinal(config) {
    const packagesDir = path.resolve(__dirname, "../../../packages");
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@acroyoga/shared": path.join(packagesDir, "shared/src"),
      "@acroyoga/shared-ui": path.join(packagesDir, "shared-ui/src"),
      "@acroyoga/tokens": path.join(packagesDir, "tokens/src"),
    };
    config.build ??= {};
    config.build.chunkSizeWarningLimit = 1200;
    return config;
  },
};

export default config;
