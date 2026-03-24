import React from "react";
import type { WebProfileCompletenessProps } from "./ProfileCompleteness";
import { DEFAULT_FIELD_LABELS } from "./ProfileCompleteness";

export function ProfileCompleteness({
  completeness,
  fieldLabels,
  style,
  ...rest
}: WebProfileCompletenessProps) {
  const labels = { ...DEFAULT_FIELD_LABELS, ...fieldLabels };
  const { percentage, fields } = completeness;

  return (
    <div style={style} {...rest}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", marginBottom: "var(--spacing-2)" }}
      >
        <span style={{ fontWeight: "var(--font-weight-semibold)" as unknown as number }}>
          {percentage}%
        </span>
        <div
          style={{
            flex: 1,
            height: 8,
            backgroundColor: "var(--color-surface-border)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
          }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Profile ${percentage}% complete`}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: "100%",
              backgroundColor: percentage === 100 ? "var(--color-success)" : "var(--color-primary)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--spacing-1)" }}>
        {(Object.keys(fields) as Array<keyof typeof fields>).map((key) => (
          <li
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-1)",
              fontSize: "var(--font-size-sm)",
              color: fields[key] ? "var(--color-success)" : "var(--color-surface-muted-foreground)",
            }}
          >
            <span aria-hidden="true">{fields[key] ? "✓" : "○"}</span>
            <span>{labels[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
