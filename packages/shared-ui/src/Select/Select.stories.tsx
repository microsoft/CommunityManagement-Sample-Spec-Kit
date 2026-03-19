import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./index.web.js";

const skillOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all_levels", label: "All Levels" },
];

const categoryOptions = [
  { value: "jam", label: "Jam" },
  { value: "workshop", label: "Workshop" },
  { value: "class", label: "Class" },
  { value: "festival", label: "Festival" },
  { value: "retreat", label: "Retreat", disabled: true },
];

const meta: Meta<typeof Select> = {
  title: "Components/Select",
  component: Select,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = { args: { label: "Skill Level", options: skillOptions, placeholder: "Choose a level…" } };
export const WithValue: Story = { args: { label: "Category", options: categoryOptions, value: "workshop" } };
export const Error: Story = { args: { label: "Category", options: categoryOptions, state: "error", errorMessage: "Please select a category" } };
export const Disabled: Story = { args: { label: "Skill Level", options: skillOptions, value: "beginner", disabled: true } };
