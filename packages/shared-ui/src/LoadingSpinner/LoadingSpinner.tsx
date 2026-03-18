import type React from "react";

export type SpinnerSize = "sm" | "md" | "lg";

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

export interface WebLoadingSpinnerProps extends LoadingSpinnerProps {
  className?: string;
  style?: React.CSSProperties;
}
