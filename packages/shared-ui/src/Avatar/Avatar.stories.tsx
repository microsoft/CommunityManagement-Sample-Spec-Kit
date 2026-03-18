import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./index.web.js";

const meta: Meta<typeof Avatar> = {
  title: "Components/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "radio", options: ["sm", "md", "lg", "xl"] },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: { src: "https://i.pravatar.cc/150?u=avatar1", alt: "User avatar", size: "lg" },
};

export const WithInitials: Story = {
  args: { initials: "ER", size: "lg" },
};

export const Small: Story = {
  args: { initials: "AB", size: "sm" },
};

export const ExtraLarge: Story = {
  args: { initials: "XL", size: "xl" },
};
