"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EventSummary, EventSummaryWithCoords } from "@acroyoga/shared/types/events";
import type { MapMarkerData, MobilePanel, DateQuickPick } from "@acroyoga/shared/types/explorer";
import { useExplorerFilters } from "@/hooks/useExplorerFilters";
import { useLocationTree } from "@/hooks/useLocationTree";
import { useCountToggle } from "@/hooks/useCountToggle";
import { extractMapMarkers } from "@/lib/explorer-api";
import { recomputeCounts } from "@/lib/location-hierarchy";
import CalendarPanel from "./CalendarPanel";
import CategoryLegendBar from "./CategoryLegendBar";
import LocationTreePanel from "./LocationTreePanel";
import DateQuickPicks from "./DateQuickPicks";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";
import { ALL_CATEGORIES } from "@/lib/category-colors";

const MapPanel = dynamic(() => import("./MapPanel"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-surface-muted, #f3f4f6)",
        borderRadius: "var(--radius-md)",
      }}
      role="img"
      aria-label="Map loading"
    >
      <span style={{ color: "var(--color-surface-muted-foreground)" }}>Loading map…</span>
    </div>
  ),
});

interface ExplorerShellProps {
  events: EventSummary[];
  coordEvents: EventSummaryWithCoords[];
}

export default function ExplorerShell({ events, coordEvents }: ExplorerShellProps) {
  const {
    categories,
    location,
    dateFrom,
    dateTo,
    setFilter,
    toggleCategory,
    setAllCategories,
    resetFilters,
    applyQuickPick,
  } = useExplorerFilters();

  const { tree } = useLocationTree();

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("list");
  const [quickPick, setQuickPick] = useState<DateQuickPick | null>(null);
  const [showFilterCounts, toggleFilterCounts] = useCountToggle("explorer.showCounts.filters");

  // Client-side category filter for events the API returned
  const filteredEvents = useMemo(() => {
    if (categories.length === ALL_CATEGORIES.length) return events;
    return events.filter((e) => categories.includes(e.category));
  }, [events, categories]);

  // Per-category counts (from API results, before category filter)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  // Recompute tree with filtered counts
  const treeWithCounts = useMemo(
    () => recomputeCounts(tree, filteredEvents),
    [tree, filteredEvents],
  );

  const markers: MapMarkerData[] = useMemo(
    () => extractMapMarkers(coordEvents.filter((e) =>
      categories.length === ALL_CATEGORIES.length || categories.includes(e.category),
    )),
    [coordEvents, categories],
  );

  const handleLocationSelect = useCallback(
    (locationId: string | null) => {
      setFilter("location", locationId);
    },
    [setFilter],
  );

  const handleDateChange = useCallback(
    (from: string, to: string) => {
      setFilter("dateFrom", from);
      setFilter("dateTo", to);
    },
    [setFilter],
  );

  const handleDayClick = useCallback(
    (from: string, to: string) => {
      setQuickPick(null);
      setFilter("dateFrom", from);
      setFilter("dateTo", to);
    },
    [setFilter],
  );

  const handleQuickPick = useCallback(
    (pick: DateQuickPick) => {
      setQuickPick((prev) => (prev === pick ? null : pick));
      applyQuickPick(pick);
    },
    [applyQuickPick],
  );

  const handleReset = useCallback(() => {
    setQuickPick(null);
    resetFilters();
  }, [resetFilters]);

  const hasActiveFilters = location != null || dateFrom != null || dateTo != null || categories.length < ALL_CATEGORIES.length;

  return (
    <div className="explorer-shell">
      {/* Mobile tab bar */}
      <nav className="explorer-shell__tabs" role="tablist" aria-label={msg.ariaExplorerPanels}>
        {(["list", "map", "filters"] as MobilePanel[]).map((panel) => (
          <button
            key={panel}
            role="tab"
            aria-selected={mobilePanel === panel}
            onClick={() => setMobilePanel(panel)}
            className={`explorer-shell__tab ${mobilePanel === panel ? "explorer-shell__tab--active" : ""}`}
          >
            {panel === "list" ? msg.tabCalendar : panel === "map" ? msg.tabMap : msg.tabFilters}
          </button>
        ))}
      </nav>

      {/* Main grid: sidebar + content */}
      <div className="explorer-shell__grid">
        {/* Left sidebar: Location hierarchy */}
        <aside
          role="region"
          aria-label={msg.ariaLocationFilter}
          tabIndex={0}
          className={`explorer-shell__sidebar ${mobilePanel !== "filters" ? "explorer-shell__sidebar--hidden-mobile" : ""}`}
        >
          <LocationTreePanel
            selectedLocation={location}
            onLocationSelect={handleLocationSelect}
            events={filteredEvents}
          />
        </aside>

        {/* Right content */}
        <div className={`explorer-shell__content ${mobilePanel === "filters" ? "explorer-shell__content--hidden-mobile" : ""}`}>
          {/* Top row: calendar (left) + filters (right) */}
          <div className={`explorer-shell__top-row ${mobilePanel !== "list" ? "explorer-shell__top-row--hidden-mobile" : ""}`}>
            <div
              role="region"
              aria-label={msg.ariaEventCalendar}
              tabIndex={0}
              className="explorer-shell__calendar"
            >
              <CalendarPanel
                events={filteredEvents}
                dateFrom={dateFrom}
                onDateChange={handleDateChange}
                onDayClick={handleDayClick}
              />
            </div>

            <div className="explorer-shell__filters">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2, 8px)" }}>
                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    style={{
                      flex: 1,
                      padding: "var(--spacing-2, 8px)",
                      borderRadius: "var(--radius-md, 6px)",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      background: "var(--color-surface-background, #fff)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-sm, 14px)",
                      fontWeight: 600,
                    }}
                  >
                    {msg.resetFilters}
                  </button>
                )}
                <button
                  onClick={toggleFilterCounts}
                  aria-label={msg.ariaToggleFilterCounts}
                  aria-pressed={showFilterCounts}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-md, 6px)",
                    border: "1px solid var(--color-border, #d1d5db)",
                    background: showFilterCounts ? "var(--color-brand-primary, #6366F1)" : "var(--color-surface-background, #fff)",
                    color: showFilterCounts ? "#fff" : "var(--color-surface-foreground, #333)",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.toggleCounts}
                </button>
              </div>
              <CategoryLegendBar
                enabledCategories={categories}
                onToggle={toggleCategory}
                onToggleAll={setAllCategories}
                categoryCounts={categoryCounts}
                showCounts={showFilterCounts}
              />
              <DateQuickPicks activePick={quickPick} onPick={handleQuickPick} />
            </div>
          </div>

          {/* Bottom: Map */}
          <div
            role="region"
            aria-label={msg.ariaEventMap}
            tabIndex={0}
            className={`explorer-shell__map ${mobilePanel !== "map" ? "explorer-shell__map--hidden-mobile" : ""}`}
          >
            <MapPanel
              tree={treeWithCounts}
              markers={markers}
              selectedLocation={location}
              onLocationSelect={handleLocationSelect}
            />
          </div>
        </div>
      </div>

      <style>{`
        .explorer-shell {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .explorer-shell__tabs {
          display: none;
        }
        .explorer-shell__grid {
          display: grid;
          grid-template-columns: 1fr 3fr;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .explorer-shell__sidebar {
          overflow-y: auto;
          min-height: 0;
          border-right: 1px solid var(--color-border, #e5e7eb);
        }
        .explorer-shell__content {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .explorer-shell__top-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
          max-height: 320px;
          overflow: hidden;
        }
        .explorer-shell__calendar {
          overflow-y: auto;
          border-right: 1px solid var(--color-border, #e5e7eb);
        }
        .explorer-shell__filters {
          overflow-y: auto;
          padding: var(--spacing-3, 12px);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2, 8px);
        }
        .explorer-shell__map {
          flex: 1;
          min-height: 200px;
        }
        .explorer-shell__sidebar:focus,
        .explorer-shell__calendar:focus,
        .explorer-shell__map:focus {
          outline: 2px solid var(--color-brand-primary, #6366F1);
          outline-offset: -2px;
        }
        .explorer-shell__tab {
          flex: 1;
          padding: var(--spacing-2, 8px);
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 400;
          border-bottom: 2px solid transparent;
        }
        .explorer-shell__tab--active {
          font-weight: 600;
          border-bottom-color: var(--color-primary, #6366F1);
        }
        @media (max-width: 640px) {
          .explorer-shell__tabs {
            display: flex;
            border-bottom: 1px solid var(--color-border, #e5e7eb);
          }
          .explorer-shell__grid {
            display: flex;
            flex-direction: column;
            grid-template-columns: unset;
          }
          .explorer-shell__content {
            flex: 1;
          }
          .explorer-shell__top-row {
            display: flex;
            flex-direction: column;
            max-height: none;
          }
          .explorer-shell__sidebar,
          .explorer-shell__calendar,
          .explorer-shell__map {
            flex: 1;
            border: none;
          }
          .explorer-shell__sidebar--hidden-mobile,
          .explorer-shell__content--hidden-mobile,
          .explorer-shell__top-row--hidden-mobile,
          .explorer-shell__map--hidden-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
