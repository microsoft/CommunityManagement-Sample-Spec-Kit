import React from "react";
import type { WebSkeletonProps, SkeletonVariant } from "./Skeleton.js";

const variantStyles: Record<SkeletonVariant, React.CSSProperties> = {
  text: { borderRadius: "var(--radius-sm, 4px)", height: "1em", width: "100%" },
  circular: { borderRadius: "50%" },
  rectangular: { borderRadius: "var(--radius-md, 6px)" },
};

function SkeletonLine({ variant = "text", width, height, className, style }: WebSkeletonProps) {
  const v = variantStyles[variant];
  const resolvedWidth = width ?? v.width;
  const resolvedHeight = height ?? (variant === "circular" ? "40px" : variant === "rectangular" ? "120px" : v.height);

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "block",
        backgroundColor: "var(--color-neutral-200)",
        animation: "shared-ui-pulse 1.5s ease-in-out infinite",
        ...v,
        width: resolvedWidth,
        height: resolvedHeight,
        ...style,
      }}
    />
  );
}

export function Skeleton({ lines, ...props }: WebSkeletonProps) {
  if (lines && lines > 1 && (props.variant ?? "text") === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2, 8px)" }}>
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonLine key={i} {...props} width={i === lines - 1 ? "75%" : "100%"} />
        ))}
        <style>{`@keyframes shared-ui-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  return (
    <>
      <SkeletonLine {...props} />
      <style>{`@keyframes shared-ui-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </>
  );
}
