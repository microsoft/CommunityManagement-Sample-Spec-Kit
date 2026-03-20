import React, { useState } from "react";
import type { WebLocationTreeProps } from "./LocationTree.js";
import type { LocationNode } from "@acroyoga/shared/types/explorer";

export function LocationTree({ nodes, selectedId, onSelect, className, style }: WebLocationTreeProps) {
  return (
    <div
      className={className}
      style={style}
      role="tree"
      aria-label="Location tree"
    >
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          level={0}
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
}: {
  node: LocationNode;
  selectedId: string | null;
  onSelect: (node: LocationNode) => void;
  level: number;
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;
  // Auto-expand if this node is an ancestor of the selected node
  const isAncestor = selectedId != null && selectedId.startsWith(node.id + "/");
  const expanded = manualExpanded ?? (isSelected || isAncestor || level === 0);

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={isSelected}>
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
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
