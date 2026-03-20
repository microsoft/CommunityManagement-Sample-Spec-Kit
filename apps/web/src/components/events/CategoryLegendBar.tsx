"use client";

import React from "react";
import { CategoryLegend } from "@acroyoga/shared-ui";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import type { EventCategory } from "@acroyoga/shared/types/events";

interface CategoryLegendBarProps {
  enabledCategories: EventCategory[];
  onToggle: (category: EventCategory) => void;
}

export default function CategoryLegendBar({ enabledCategories, onToggle }: CategoryLegendBarProps) {
  return (
    <div style={{ padding: "var(--spacing-3)" }}>
      <CategoryLegend
        categories={CATEGORY_COLORS}
        enabledCategories={enabledCategories}
        onToggle={onToggle}
      />
    </div>
  );
}
