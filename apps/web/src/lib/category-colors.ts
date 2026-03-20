import type { EventCategory } from "@acroyoga/shared/types/events";
import type { CategoryColorConfig } from "@acroyoga/shared/types/explorer";

export const CATEGORY_COLORS: readonly CategoryColorConfig[] = [
  { category: "jam", tokenName: "--color-category-jam", labelKey: "category.jam" },
  { category: "workshop", tokenName: "--color-category-workshop", labelKey: "category.workshop" },
  { category: "class", tokenName: "--color-category-class", labelKey: "category.class" },
  { category: "festival", tokenName: "--color-category-festival", labelKey: "category.festival" },
  { category: "social", tokenName: "--color-category-social", labelKey: "category.social" },
  { category: "retreat", tokenName: "--color-category-retreat", labelKey: "category.retreat" },
  { category: "teacher_training", tokenName: "--color-category-training", labelKey: "category.teacherTraining" },
] as const;

export const ALL_CATEGORIES: EventCategory[] = CATEGORY_COLORS.map((c) => c.category);

export function getCategoryColor(category: EventCategory): string {
  const config = CATEGORY_COLORS.find((c) => c.category === category);
  return config ? `var(${config.tokenName})` : "var(--color-surface-muted)";
}

export function getCategoryTokenName(category: EventCategory): string {
  const config = CATEGORY_COLORS.find((c) => c.category === category);
  return config?.tokenName ?? "--color-surface-muted";
}

export function getCategoryLabel(category: EventCategory): string {
  const config = CATEGORY_COLORS.find((c) => c.category === category);
  return config?.labelKey ?? category;
}
