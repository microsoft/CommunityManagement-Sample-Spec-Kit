import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./index.web.js";

const meta: Meta<typeof EmptyState> = {
  title: "Components/EmptyState",
  component: EmptyState,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoEvents: Story = {
  args: { icon: "📅", title: "No events yet", description: "Create your first event to get started." },
};

export const NoResults: Story = {
  args: { icon: "🔍", title: "No results found", description: "Try adjusting your search or filters." },
};

export const NoIcon: Story = {
  args: { title: "Nothing here", description: "Check back later." },
};
