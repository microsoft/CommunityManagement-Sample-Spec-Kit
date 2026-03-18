import type { Meta, StoryObj } from "@storybook/react";
import { Toast } from "./index.web.js";

const meta: Meta<typeof Toast> = {
  title: "Components/Toast",
  component: Toast,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Info: Story = { args: { message: "Event details updated.", variant: "info", visible: true } };
export const Success: Story = { args: { message: "RSVP confirmed!", variant: "success", visible: true } };
export const Warning: Story = { args: { message: "Only 2 spots remaining.", variant: "warning", visible: true } };
export const Error: Story = { args: { message: "Failed to save changes.", variant: "error", visible: true } };
export const Dismissible: Story = { args: { message: "Copied event link.", variant: "success", visible: true, onDismiss: () => {} } };
