import type React from "react";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export interface WebBadgeProps extends BadgeProps {
  className?: string;
  style?: React.CSSProperties;
}
