"use client";

import React, { useMemo, useCallback } from "react";
import { LocationTree } from "@acroyoga/shared-ui";
import { useLocationTree } from "@/hooks/useLocationTree";
import type { LocationNode } from "@acroyoga/shared/types/explorer";
import type { EventSummary } from "@acroyoga/shared/types/events";
import { recomputeCounts, findNode } from "@/lib/location-hierarchy";
import { getCategoryColor } from "@/lib/category-colors";
import { format, parseISO } from "date-fns";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";

interface LocationTreePanelProps {
  selectedLocation: string | null;
  onLocationSelect: (locationId: string | null) => void;
  events: EventSummary[];
}

export default function LocationTreePanel({ selectedLocation, onLocationSelect, events }: LocationTreePanelProps) {
  const { filteredTree, loading, searchTerm, setSearchTerm } = useLocationTree();

  // Recompute event counts based on the filtered events
  const treeWithCounts = useMemo(
    () => recomputeCounts(filteredTree, events),
    [filteredTree, events],
  );

  // At city level, show individual events
  const isCityLevel = selectedLocation != null && selectedLocation.split("/").length >= 3;

  const cityEvents = useMemo(() => {
    if (!isCityLevel || !selectedLocation) return [];
    const node = findNode(treeWithCounts, selectedLocation);
    if (!node) return [];
    // Match events by citySlug
    return events.filter((e) => e.citySlug === node.slug);
  }, [isCityLevel, selectedLocation, treeWithCounts, events]);

  const cityName = useMemo(() => {
    if (!isCityLevel || !selectedLocation) return "";
    const node = findNode(treeWithCounts, selectedLocation);
    return node?.name ?? "";
  }, [isCityLevel, selectedLocation, treeWithCounts]);

  const handleSelect = useCallback(
    (node: LocationNode) => {
      // Deselect if clicking the already-selected node
      if (node.id === selectedLocation) {
        // Go to parent level
        const parts = node.id.split("/");
        if (parts.length > 1) {
          onLocationSelect(parts.slice(0, -1).join("/"));
        } else {
          onLocationSelect(null);
        }
      } else {
        onLocationSelect(node.id);
      }
    },
    [selectedLocation, onLocationSelect],
  );

  if (loading) {
    return <div style={{ padding: "var(--spacing-4)" }}>{msg.loadingLocations}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "var(--spacing-3)" }}>
        <input
          type="search"
          placeholder={msg.filterLocationsPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label={msg.ariaFilterLocations}
          style={{
            width: "100%",
            padding: "var(--spacing-2)",
            borderRadius: "var(--radius-md, 6px)",
            border: "1px solid var(--color-border, #d1d5db)",
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <LocationTree
          nodes={treeWithCounts}
          selectedId={selectedLocation}
          onSelect={handleSelect}
        />
        {/* City-level: show individual events */}
        {isCityLevel && (
          <div style={{ padding: "var(--spacing-3, 12px)", borderTop: "1px solid var(--color-border, #e5e7eb)" }}>
            <h4 style={{ fontSize: "var(--font-size-sm, 14px)", fontWeight: 600, margin: "0 0 8px", color: "var(--color-surface-foreground)" }}>
              {msg.cityEventsTitle(cityName)}
            </h4>
            {cityEvents.length === 0 ? (
              <p style={{ fontSize: "var(--font-size-xs, 12px)", color: "var(--color-surface-muted-foreground)", margin: 0 }}>
                {msg.noCityEvents}
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {cityEvents.map((event) => (
                  <li
                    key={event.id}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "var(--radius-sm, 4px)",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      fontSize: "var(--font-size-xs, 12px)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: getCategoryColor(event.category),
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {event.title}
                      </span>
                    </div>
                    <div style={{ marginTop: 2, color: "var(--color-surface-muted-foreground)", fontSize: 11 }}>
                      {format(parseISO(event.startDatetime), "MMM d, yyyy")} · {event.venueName}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
