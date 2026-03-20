"use client";

import React from "react";
import type { DateQuickPick } from "@acroyoga/shared/types/explorer";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";

const QUICK_PICKS: { id: DateQuickPick; label: string }[] = [
  { id: "this-week", label: msg.quickPickThisWeek },
  { id: "this-weekend", label: msg.quickPickThisWeekend },
  { id: "this-month", label: msg.quickPickThisMonth },
  { id: "next-30-days", label: msg.quickPickNext30Days },
];

interface DateQuickPicksProps {
  activePick: DateQuickPick | null;
  onPick: (pick: DateQuickPick) => void;
}

export default function DateQuickPicks({ activePick, onPick }: DateQuickPicksProps) {
  return (
    <div role="group" aria-label={msg.ariaQuickDateFilters} style={{ display: "flex", gap: "var(--spacing-2)", flexWrap: "wrap", padding: "var(--spacing-2) var(--spacing-3)" }}>
      {QUICK_PICKS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={activePick === id}
          onClick={() => onPick(id)}
          style={{
            padding: "var(--spacing-1) var(--spacing-3)",
            borderRadius: "var(--radius-full, 999px)",
            border: "1px solid var(--color-border, #d1d5db)",
            background: activePick === id ? "var(--color-surface-active, #e0e7ff)" : "transparent",
            fontWeight: activePick === id ? 600 : 400,
            fontSize: "0.8125rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
