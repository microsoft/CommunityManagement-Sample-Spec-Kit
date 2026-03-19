import React from "react";
import type { WebLoadingSpinnerProps, SpinnerSize } from "./LoadingSpinner.js";

const sizeMap: Record<SpinnerSize, string> = {
  sm: "16px",
  md: "24px",
  lg: "40px",
};

const borderWidthMap: Record<SpinnerSize, string> = {
  sm: "2px",
  md: "3px",
  lg: "4px",
};

export function LoadingSpinner({ size = "md", label = "Loading…", className, style }: WebLoadingSpinnerProps) {
  const dim = sizeMap[size];
  const bw = borderWidthMap[size];

  return (
    <span
      className={className}
      role="status"
      aria-label={label}
      style={{
        display: "inline-block",
        width: dim,
        height: dim,
        border: `${bw} solid var(--color-neutral-200)`,
        borderTopColor: "var(--color-brand-primary, #6366f1)",
        borderRadius: "50%",
        animation: "shared-ui-spin 0.6s linear infinite",
        ...style,
      }}
    >
      <style>{`@keyframes shared-ui-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
