import React from "react";
import type { ToastProps, ToastVariant } from "./Toast.js";

const variantStyles: Record<ToastVariant, { bg: string; text: string; border: string }> = {
  info: {
    bg: "var(--color-semantic-info, #3b82f6)",
    text: "#fff",
    border: "var(--color-semantic-info, #3b82f6)",
  },
  success: {
    bg: "var(--color-semantic-success, #10b981)",
    text: "#fff",
    border: "var(--color-semantic-success, #10b981)",
  },
  warning: {
    bg: "var(--color-semantic-warning, #f59e0b)",
    text: "#000",
    border: "var(--color-semantic-warning, #f59e0b)",
  },
  error: {
    bg: "var(--color-semantic-error, #ef4444)",
    text: "#fff",
    border: "var(--color-semantic-error, #ef4444)",
  },
};

export function Toast({ message, variant = "info", visible, onDismiss }: ToastProps) {
  if (!visible) return null;

  const styles = variantStyles[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "var(--spacing-6, 24px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3, 12px)",
        padding: "var(--spacing-3, 12px) var(--spacing-4, 16px)",
        borderRadius: "var(--radius-md, 8px)",
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        boxShadow: "var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))",
        fontSize: "var(--font-size-sm, 14px)",
        fontWeight: 500,
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            fontSize: "1.25rem",
            lineHeight: 1,
            padding: "var(--spacing-1, 4px)",
            opacity: 0.8,
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
}
