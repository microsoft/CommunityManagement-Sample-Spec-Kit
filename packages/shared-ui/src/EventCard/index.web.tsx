import React from "react";
import type { WebEventCardProps } from "./EventCard.js";
import { formatEventDate, formatCurrency } from "@acroyoga/shared/utils/format";

export function EventCard({ event, onPress, labels, style, ...rest }: WebEventCardProps) {
  const freeLabel = labels?.free ?? "Free";
  const spotsLabel = labels?.spots ?? `${event.confirmedCount}/${event.capacity} spots`;
  const costDisplay = event.cost === 0 ? freeLabel : formatCurrency(event.cost, event.currency);
  const dateDisplay = formatEventDate(event.startDatetime);

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={() => onPress?.(event.id)}
      onKeyDown={(e) => e.key === "Enter" && onPress?.(event.id)}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-surface-border)",
        backgroundColor: "var(--color-surface-card)",
        color: "var(--color-surface-card-foreground)",
        overflow: "hidden",
        cursor: onPress ? "pointer" : "default",
        fontFamily: "var(--font-family-sans)",
        transition: `box-shadow var(--global-transition-fast)`,
        ...style,
      }}
      {...rest}
    >
      {event.posterImageUrl && (
        <img
          src={event.posterImageUrl}
          alt={event.title}
          style={{ width: "100%", height: 160, objectFit: "cover" }}
        />
      )}
      <div style={{ padding: "var(--spacing-4)", display: "flex", flexDirection: "column", gap: "var(--spacing-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)" as string,
              color: "var(--color-brand-primary)",
              textTransform: "capitalize",
            }}
          >
            {event.category.replace("_", " ")}
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-surface-muted-foreground)",
              textTransform: "capitalize",
            }}
          >
            {event.skillLevel.replace("_", " ")}
          </span>
        </div>
        <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)" as string }}>
          {event.title}
        </h3>
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-surface-muted-foreground)" }}>
          {dateDisplay} · {event.venueName}, {event.cityName}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--spacing-2)" }}>
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" as string }}>
            {costDisplay}
          </span>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-surface-muted-foreground)" }}>
            {spotsLabel}
          </span>
        </div>
        {event.userRsvpStatus && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)" as string,
              color: "var(--color-semantic-success)",
              textTransform: "capitalize",
            }}
          >
            {event.userRsvpStatus}
          </span>
        )}
      </div>
    </div>
  );
}
