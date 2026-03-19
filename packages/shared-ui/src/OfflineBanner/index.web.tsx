import React from "react";
import type { WebOfflineBannerProps } from "./OfflineBanner.js";

export function OfflineBanner({
  message = "You are offline. Some features may be unavailable.",
  visible = true,
  className,
  style,
}: WebOfflineBannerProps) {
  if (!visible) return null;

  return (
    <div
      className={className}
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2, 8px)",
        padding: "var(--spacing-2, 8px) var(--spacing-4, 16px)",
        backgroundColor: "var(--color-feedback-warning-bg, #fef9c3)",
        color: "var(--color-feedback-warning-text, #854d0e)",
        fontSize: "0.875rem",
        fontWeight: 500,
        ...style,
      }}
    >
      <span aria-hidden="true">⚠</span>
      <span>{message}</span>
    </div>
  );
}
