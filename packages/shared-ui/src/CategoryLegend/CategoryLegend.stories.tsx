import type { Meta, StoryObj } from "@storybook/react";
import { CategoryLegend } from "./index.web.js";
import type { CategoryColorConfig } from "@acroyoga/shared/types/explorer";

const categories: CategoryColorConfig[] = [
  { category: "jam", tokenName: "--color-category-jam", labelKey: "category.jam" },
  { category: "workshop", tokenName: "--color-category-workshop", labelKey: "category.workshop" },
  { category: "class", tokenName: "--color-category-class", labelKey: "category.class" },
  { category: "festival", tokenName: "--color-category-festival", labelKey: "category.festival" },
  { category: "social", tokenName: "--color-category-social", labelKey: "category.social" },
  { category: "retreat", tokenName: "--color-category-retreat", labelKey: "category.retreat" },
  { category: "teacher_training", tokenName: "--color-category-training", labelKey: "category.teacherTraining" },
];

const meta: Meta<typeof CategoryLegend> = {
  title: "Components/CategoryLegend",
  component: CategoryLegend,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CategoryLegend>;

export const AllActive: Story = {
  args: { categories, enabledCategories: [], onToggle: () => {} },
};

export const SomeActive: Story = {
  args: { categories, enabledCategories: ["jam", "workshop", "class"], onToggle: () => {} },
};

export const NoneActive: Story = {
  args: { categories, enabledCategories: ["nonexistent" as any], onToggle: () => {} },
};
