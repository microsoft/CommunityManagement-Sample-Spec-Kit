import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./index.web.js";

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { label: "Email", placeholder: "you@example.com" } };
export const WithValue: Story = { args: { label: "Name", value: "Elena Rodriguez" } };
export const Error: Story = { args: { label: "Email", state: "error", errorMessage: "Invalid email address", value: "bad" } };
export const Success: Story = { args: { label: "Username", state: "success", value: "elena_r" } };
export const Disabled: Story = { args: { label: "Locked Field", value: "Cannot edit", disabled: true } };
