import React from "react";
import type { WebCategoryLegendProps } from "./CategoryLegend.js";

export function CategoryLegend({
  categories,
  enabledCategories,
  onToggle,
  className,
  style,
}: WebCategoryLegendProps) {
  // Empty enabledCategories means all are active
  const allActive = enabledCategories.length === 0;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--spacing-2, 8px)",
        alignItems: "center",
        ...style,
      }}
      role="group"
      aria-label="Filter events by category"
    >
      {categories.map((config) => {
        const isEnabled = allActive || enabledCategories.includes(config.category);
        return (
          <button
            key={config.category}
            onClick={() => onToggle(config.category)}
            aria-pressed={isEnabled}
            aria-label={`${config.category.replace("_", " ")} category filter`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--spacing-1, 4px)",
              padding: "var(--spacing-1, 4px) var(--spacing-3, 12px)",
              borderRadius: "var(--radius-full, 9999px)",
              border: `2px solid var(${config.tokenName})`,
              backgroundColor: isEnabled ? `var(${config.tokenName})` : "transparent",
              color: isEnabled ? "#fff" : `var(${config.tokenName})`,
              fontSize: "var(--font-size-xs, 12px)",
              fontWeight: 500,
              cursor: "pointer",
              opacity: isEnabled ? 1 : 0.6,
              transition: "all 150ms ease",
              minHeight: 32,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isEnabled ? "#fff" : `var(${config.tokenName})`,
                flexShrink: 0,
              }}
            />
            {config.category.replace("_", " ")}
          </button>
        );
      })}
    </div>
  );
}
