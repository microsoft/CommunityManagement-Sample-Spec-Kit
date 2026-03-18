import type { StorybookConfig } from "storybook/internal/types";

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
};

export default config;
