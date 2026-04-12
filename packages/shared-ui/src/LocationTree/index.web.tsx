"use client";

import React, { useState } from "react";
import type { WebLocationTreeProps } from "./LocationTree.js";
import type { LocationNode } from "@acroyoga/shared/types/explorer";

export function LocationTree({ nodes, selectedId, onSelect, className, style, expandAll }: WebLocationTreeProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const container = e.currentTarget;
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[role="treeitem"]'),
    ).filter((el) => {
      // Only include visible items (not hidden by collapsed parents)
      return el.offsetParent !== null;
    });
    const focused = document.activeElement as HTMLElement;
    const idx = items.indexOf(focused);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        items[idx + 1]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[idx - 1]?.focus();
        break;
      case "Home":
        e.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
    }
  }

  return (
    <div
      className={className}
      style={style}
      role="tree"
      aria-label="Location tree"
      onKeyDown={handleKeyDown}
    >
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          level={0}
          expandAll={expandAll}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  level,
  expandAll,
}: {
  node: LocationNode;
  selectedId: string | null;
  onSelect: (node: LocationNode) => void;
  level: number;
  expandAll?: boolean;
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;
  // Auto-expand if this node is an ancestor of the selected node
  const isAncestor = selectedId != null && selectedId.startsWith(node.id + "/");
  const expanded = expandAll || (manualExpanded ?? (isSelected || isAncestor || level <= 1));

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={isSelected} aria-level={level + 1} tabIndex={isSelected ? 0 : -1}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          paddingLeft: `${level * 16 + 8}px`,
          minHeight: 36,
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setManualExpanded(!expanded); }}
            aria-label={expanded ? "Collapse" : "Expand"}
            style={{
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "10px",
              flexShrink: 0,
              padding: 0,
              color: "var(--color-surface-foreground)",
            }}
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span style={{ width: 24 }} />
        )}
        <button
          onClick={() => onSelect(node)}
          aria-label={`${node.name} (${node.eventCount} events)`}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-1, 4px)",
            padding: "var(--spacing-1, 4px) var(--spacing-2, 8px)",
            backgroundColor: isSelected ? "var(--color-brand-primary)" : "transparent",
            color: isSelected ? "#fff" : "var(--color-surface-foreground)",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--font-size-sm, 14px)",
            textAlign: "left",
            borderRadius: "var(--radius-sm, 4px)",
            minHeight: 36,
          }}
        >
          <span style={{ flex: 1 }}>{node.name}</span>
          <span
            style={{
              fontSize: "var(--font-size-xs, 12px)",
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            {node.eventCount}
          </span>
        </button>
      </div>
      {hasChildren && expanded && (
        <div role="group" aria-label={node.name}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
              expandAll={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
