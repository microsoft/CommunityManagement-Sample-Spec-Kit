import type { Meta, StoryObj } from "@storybook/react";
import { TextArea } from "./index.web.js";

const meta: Meta<typeof TextArea> = {
  title: "Components/TextArea",
  component: TextArea,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = { args: { label: "Bio", placeholder: "Tell us about yourself…" } };
export const WithValue: Story = { args: { label: "Description", value: "AcroYoga workshop covering therapeutic flying and inversions." } };
export const Error: Story = { args: { label: "Bio", state: "error", errorMessage: "Bio is required", value: "" } };
export const WithCharCount: Story = { args: { label: "Bio", maxLength: 200, value: "Hello world" } };
export const Disabled: Story = { args: { label: "Notes", value: "Read-only content", disabled: true } };
