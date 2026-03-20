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
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={isSelected}>
      <button
        onClick={() => {
          if (hasChildren) {
            setExpanded(!expanded);
          }
          onSelect(node);
        }}
        aria-label={`${node.name} (${node.eventCount} events)`}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: `var(--spacing-1, 4px) var(--spacing-2, 8px)`,
          paddingLeft: `${level * 16 + 8}px`,
          backgroundColor: isSelected ? "var(--color-brand-primary)" : "transparent",
          color: isSelected ? "#fff" : "var(--color-surface-foreground)",
          border: "none",
          cursor: "pointer",
          fontSize: "var(--font-size-sm, 14px)",
          textAlign: "left",
          borderRadius: "var(--radius-sm, 4px)",
          minHeight: 36,
          gap: "var(--spacing-1, 4px)",
        }}
      >
        {hasChildren && (
          <span style={{ width: 16, textAlign: "center", fontSize: "10px", flexShrink: 0 }}>
            {expanded ? "▼" : "▶"}
          </span>
        )}
        {!hasChildren && <span style={{ width: 16 }} />}
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
