import React from "react";
import type { WebTeacherCardProps } from "./TeacherCard.js";

const badgeColors: Record<string, string> = {
  verified: "var(--color-semantic-success)",
  pending: "var(--color-semantic-warning)",
  expired: "var(--color-surface-muted-foreground)",
  revoked: "var(--color-semantic-error)",
};

export function TeacherCard({ teacher, onPress, style, ...rest }: WebTeacherCardProps) {
  return (
    <div
      role="article"
      tabIndex={0}
      onClick={() => onPress?.(teacher.id)}
      onKeyDown={(e) => e.key === "Enter" && onPress?.(teacher.id)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-3)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-surface-border)",
        backgroundColor: "var(--color-surface-card)",
        color: "var(--color-surface-card-foreground)",
        padding: "var(--spacing-5)",
        cursor: onPress ? "pointer" : "default",
        fontFamily: "var(--font-family-sans)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)" as string }}>
          {teacher.user_name}
        </h3>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)" as string,
            color: badgeColors[teacher.badge_status] ?? "var(--color-surface-muted-foreground)",
            textTransform: "capitalize",
          }}
        >
          {teacher.badge_status}
        </span>
      </div>
      {teacher.specialties.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-1)" }}>
          {teacher.specialties.map((s) => (
            <span
              key={s}
              style={{
                fontSize: "var(--font-size-xs)",
                padding: "var(--spacing-0) var(--spacing-2)",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-surface-muted)",
                color: "var(--color-surface-muted-foreground)",
                textTransform: "capitalize",
              }}
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
      {teacher.aggregate_rating && (
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-surface-muted-foreground)" }}>
          ★ {teacher.aggregate_rating} ({teacher.review_count} reviews)
        </div>
      )}
      {teacher.bio && (
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: "var(--color-surface-muted-foreground)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {teacher.bio}
        </p>
      )}
    </div>
  );
}
