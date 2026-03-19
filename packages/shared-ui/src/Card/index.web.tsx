import React from "react";
import type { WebCardProps, CardVariant } from "./Card.js";

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: "var(--color-surface-card)",
    color: "var(--color-surface-card-foreground)",
    border: "1px solid var(--color-surface-border)",
    boxShadow: "none",
  },
  elevated: {
    backgroundColor: "var(--color-surface-card)",
    color: "var(--color-surface-card-foreground)",
    border: "none",
    boxShadow: "var(--shadow-md)",
  },
  outlined: {
    backgroundColor: "transparent",
    color: "var(--color-surface-foreground)",
    border: "2px solid var(--color-surface-border)",
    boxShadow: "none",
  },
};

export function Card({ variant = "default", children, style, ...rest }: WebCardProps) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "var(--spacing-6)",
        fontFamily: "var(--font-family-sans)",
        ...variantStyles[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
