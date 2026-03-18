import type { Meta, StoryObj } from "@storybook/react";
import { OfflineBanner } from "./index.web.js";

const meta: Meta<typeof OfflineBanner> = {
  title: "Components/OfflineBanner",
  component: OfflineBanner,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof OfflineBanner>;

export const Default: Story = {};
export const CustomMessage: Story = { args: { message: "No internet connection detected." } };
export const Hidden: Story = { args: { visible: false } };
