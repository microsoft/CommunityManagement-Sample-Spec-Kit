import React from "react";
import type { WebEmptyStateProps } from "./EmptyState.js";

export function EmptyState({ icon, title, description, className, style, children }: WebEmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--spacing-8, 32px) var(--spacing-4, 16px)",
        gap: "var(--spacing-3, 12px)",
        ...style,
      }}
    >
      {icon && (
        <span
          aria-hidden="true"
          style={{ fontSize: "2.5rem", lineHeight: 1 }}
        >
          {icon}
        </span>
      )}
      <h3
        style={{
          margin: 0,
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "var(--color-neutral-800)",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--color-neutral-500)",
            maxWidth: "320px",
          }}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
