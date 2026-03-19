import React from "react";
import type { WebBadgeProps, BadgeVariant } from "./Badge.js";

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: "var(--color-neutral-200)",
    color: "var(--color-neutral-800)",
  },
  success: {
    backgroundColor: "var(--color-feedback-success-bg, #dcfce7)",
    color: "var(--color-feedback-success-text, #166534)",
  },
  warning: {
    backgroundColor: "var(--color-feedback-warning-bg, #fef9c3)",
    color: "var(--color-feedback-warning-text, #854d0e)",
  },
  error: {
    backgroundColor: "var(--color-feedback-error-bg, #fee2e2)",
    color: "var(--color-feedback-error-text, #991b1b)",
  },
  info: {
    backgroundColor: "var(--color-feedback-info-bg, #dbeafe)",
    color: "var(--color-feedback-info-text, #1e40af)",
  },
};

export function Badge({ label, variant = "default", className, style }: WebBadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: "var(--radius-full, 9999px)",
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span className={className} style={baseStyle}>
      {label}
    </span>
  );
}
