"use client";

import React from "react";
import type { EventSummary } from "@acroyoga/shared/types/events";
import type { MapMarkerData } from "@acroyoga/shared/types/explorer";
import { getCategoryColor } from "@/lib/category-colors";
import { format, parseISO } from "date-fns";

interface MapMarkerPopupProps {
  marker: MapMarkerData;
}

export default function MapMarkerPopup({ marker }: MapMarkerPopupProps) {
  return (
    <div style={{ minWidth: 200, padding: "var(--spacing-2)" }}>
      <h4
        style={{
          fontWeight: "var(--font-weight-semibold)",
          fontSize: "var(--font-size-sm)",
          margin: 0,
          marginBottom: "var(--spacing-1)",
        }}
      >
        {marker.title}
      </h4>
      <p
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-surface-muted-foreground)",
          margin: 0,
          marginBottom: "var(--spacing-1)",
        }}
      >
        {format(parseISO(marker.date), "EEE, MMM d · HH:mm")}
      </p>
      <p
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-surface-muted-foreground)",
          margin: 0,
          marginBottom: "var(--spacing-2)",
        }}
      >
        {marker.venueName} · {marker.cityName}
      </p>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: getCategoryColor(marker.category),
            display: "inline-block",
          }}
        />
        {marker.category.replace("_", " ")}
      </span>
    </div>
  );
}
