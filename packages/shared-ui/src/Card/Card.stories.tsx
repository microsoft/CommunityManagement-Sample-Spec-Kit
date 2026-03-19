import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./index.web.js";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  argTypes: {
    variant: { control: "select", options: ["default", "elevated", "outlined"] },
  },
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    variant: "default",
    children: "Default card with border",
  },
};

export const Elevated: Story = {
  args: {
    variant: "elevated",
    children: "Elevated card with shadow",
  },
};

export const Outlined: Story = {
  args: {
    variant: "outlined",
    children: "Outlined card with transparent bg",
  },
};
