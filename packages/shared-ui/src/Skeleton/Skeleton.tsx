import type React from "react";

export type SkeletonVariant = "text" | "circular" | "rectangular";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export interface WebSkeletonProps extends SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}
