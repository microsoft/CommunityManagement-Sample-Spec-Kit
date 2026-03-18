import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./index.web.js";

const meta: Meta<typeof Skeleton> = {
  title: "Components/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
  argTypes: {
    variant: { control: "radio", options: ["text", "circular", "rectangular"] },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const TextLine: Story = { args: { variant: "text" } };
export const MultiLineText: Story = { args: { variant: "text", lines: 3 } };
export const Circular: Story = { args: { variant: "circular", width: "56px", height: "56px" } };
export const Rectangular: Story = { args: { variant: "rectangular", width: "100%", height: "200px" } };
