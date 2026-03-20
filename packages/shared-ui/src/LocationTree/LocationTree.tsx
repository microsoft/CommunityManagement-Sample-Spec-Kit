import type React from "react";
import type { LocationNode } from "@acroyoga/shared/types/explorer";

export interface LocationTreeProps {
  nodes: LocationNode[];
  selectedId: string | null;
  onSelect: (node: LocationNode) => void;
}

export interface WebLocationTreeProps extends LocationTreeProps {
  className?: string;
  style?: React.CSSProperties;
}
