import type React from "react";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export interface WebEmptyStateProps extends EmptyStateProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
