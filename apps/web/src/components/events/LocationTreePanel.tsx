"use client";

import React, { useMemo, useCallback } from "react";
import { LocationTree } from "@acroyoga/shared-ui";
import { useLocationTree } from "@/hooks/useLocationTree";
import type { LocationNode } from "@acroyoga/shared/types/explorer";
import type { EventSummary } from "@acroyoga/shared/types/events";
import { recomputeCounts } from "@/lib/location-hierarchy";
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
      </div>
    </div>
  );
}
