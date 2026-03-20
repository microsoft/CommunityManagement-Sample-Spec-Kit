"use client";

import React from "react";
import { CategoryLegend } from "@acroyoga/shared-ui";
import { CATEGORY_COLORS, ALL_CATEGORIES } from "@/lib/category-colors";
import type { EventCategory } from "@acroyoga/shared/types/events";

interface CategoryLegendBarProps {
  enabledCategories: EventCategory[];
  onToggle: (category: EventCategory) => void;
  onToggleAll?: (all: boolean) => void;
  categoryCounts?: Record<string, number>;
  showCounts?: boolean;
}

export default function CategoryLegendBar({ enabledCategories, onToggle, onToggleAll, categoryCounts, showCounts = true }: CategoryLegendBarProps) {
  const allSelected = enabledCategories.length === ALL_CATEGORIES.length;

  return (
    <div style={{ padding: "var(--spacing-3)", display: "flex", alignItems: "center", gap: "var(--spacing-2, 8px)" }}>
      {onToggleAll && (
        <button
          onClick={() => onToggleAll(!allSelected)}
          style={{
            padding: "var(--spacing-1, 4px) var(--spacing-2, 8px)",
            borderRadius: "var(--radius-md, 6px)",
            border: "1px solid var(--color-border, #e5e7eb)",
            background: "var(--color-surface-background, #fff)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 12px)",
            fontWeight: 600,
            whiteSpace: "nowrap",
            minHeight: 32,
          }}
        >
          {allSelected ? "None" : "All"}
        </button>
      )}
      <CategoryLegend
        categories={CATEGORY_COLORS}
        enabledCategories={enabledCategories}
        onToggle={onToggle}
        categoryCounts={showCounts ? categoryCounts : undefined}
      />
    </div>
  );
}
