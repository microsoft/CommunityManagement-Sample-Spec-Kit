import type React from "react";
import type { EventCategory } from "@acroyoga/shared/types/events";
import type { CategoryColorConfig } from "@acroyoga/shared/types/explorer";

export interface CategoryLegendProps {
  categories: readonly CategoryColorConfig[];
  enabledCategories: EventCategory[];
  onToggle: (category: EventCategory) => void;
}

export interface WebCategoryLegendProps extends CategoryLegendProps {
  className?: string;
  style?: React.CSSProperties;
}
