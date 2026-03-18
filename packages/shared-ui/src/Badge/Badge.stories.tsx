import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./index.web.js";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "radio", options: ["default", "success", "warning", "error", "info"] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { label: "Default" } };
export const Success: Story = { args: { label: "Verified", variant: "success" } };
export const Warning: Story = { args: { label: "Pending", variant: "warning" } };
export const Error: Story = { args: { label: "Expired", variant: "error" } };
export const Info: Story = { args: { label: "New", variant: "info" } };
