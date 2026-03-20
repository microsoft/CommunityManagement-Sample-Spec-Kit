"use client";

import React, { useMemo, useCallback } from "react";
import { LocationTree } from "@acroyoga/shared-ui";
import { useLocationTree } from "@/hooks/useLocationTree";
import type { LocationNode } from "@acroyoga/shared/types/explorer";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";

interface LocationTreePanelProps {
  selectedPath: string[];
  onSelect: (path: string[]) => void;
}

export default function LocationTreePanel({ selectedPath, onSelect }: LocationTreePanelProps) {
  const { filteredTree, loading, searchTerm, setSearchTerm } = useLocationTree();

  const handleSelect = useCallback(
    (node: LocationNode) => {
      const path = node.id === "all" ? [] : [node.id];
      onSelect(path);
    },
    [onSelect],
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
          nodes={filteredTree}
          selectedId={selectedPath[selectedPath.length - 1] ?? null}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
