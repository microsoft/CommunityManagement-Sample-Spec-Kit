"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EventSummary, EventSummaryWithCoords } from "@acroyoga/shared/types/events";
import type { MapMarkerData, MobilePanel, DateQuickPick } from "@acroyoga/shared/types/explorer";
import { useExplorerFilters } from "@/hooks/useExplorerFilters";
import { extractMapMarkers } from "@/lib/explorer-api";
import CalendarPanel from "./CalendarPanel";
import CategoryLegendBar from "./CategoryLegendBar";
import LocationTreePanel from "./LocationTreePanel";
import DateQuickPicks from "./DateQuickPicks";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";

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
    applyQuickPick,
  } = useExplorerFilters();

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("list");
  const [quickPick, setQuickPick] = useState<DateQuickPick | null>(null);
  const [locationPath, setLocationPath] = useState<string[]>(
    location ? [location] : [],
  );
  const [syncMapToList, setSyncMapToList] = useState(false);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  const markers: MapMarkerData[] = useMemo(
    () => extractMapMarkers(coordEvents),
    [coordEvents],
  );

  /** Events filtered to the visible map bounds when sync is active */
  const visibleEvents = useMemo(() => {
    if (!syncMapToList || !mapBounds) return events;
    return events.filter((e) => {
      const coord = coordEvents.find((c) => c.id === e.id);
      if (!coord?.venueLatitude || !coord?.venueLongitude) return true;
      return (
        coord.venueLatitude >= mapBounds.south &&
        coord.venueLatitude <= mapBounds.north &&
        coord.venueLongitude >= mapBounds.west &&
        coord.venueLongitude <= mapBounds.east
      );
    });
  }, [events, coordEvents, syncMapToList, mapBounds]);

  const selectedMapLocation = useMemo(() => {
    if (!locationPath.length) return null;
    const match = markers.find((m) => m.cityName === locationPath[locationPath.length - 1]);
    if (match) return { lat: match.latitude, lng: match.longitude, zoom: 12 };
    return null;
  }, [locationPath, markers]);

  const handleLocationSelect = useCallback(
    (path: string[]) => {
      setLocationPath(path);
      setFilter("location", path.length ? path[path.length - 1] : null);
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

  return (
    <div className="explorer-shell">
      {/* Header row - legend + quick picks */}
      <header className="explorer-shell__header">
        <CategoryLegendBar
          enabledCategories={categories}
          onToggle={toggleCategory}
          onToggleAll={setAllCategories}
        />
        <DateQuickPicks activePick={quickPick} onPick={handleQuickPick} />
      </header>

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

      {/* 2-column grid: sidebar 1/4, content 3/4 */}
      <div className="explorer-shell__grid">
        {/* Left panel: Location tree */}
        <aside
          role="region"
          aria-label={msg.ariaLocationFilter}
          tabIndex={0}
          className={`explorer-shell__sidebar ${mobilePanel !== "filters" ? "explorer-shell__sidebar--hidden-mobile" : ""}`}
        >
          <LocationTreePanel selectedPath={locationPath} onSelect={handleLocationSelect} />
        </aside>

        {/* Right content: Calendar stacked above Map */}
        <div className={`explorer-shell__content ${mobilePanel === "filters" ? "explorer-shell__content--hidden-mobile" : ""}`}>
          <div
            role="region"
            aria-label={msg.ariaEventCalendar}
            tabIndex={0}
            className={`explorer-shell__calendar ${mobilePanel !== "list" ? "explorer-shell__calendar--hidden-mobile" : ""}`}
          >
            <CalendarPanel
              events={visibleEvents}
              dateFrom={dateFrom}
              onDateChange={handleDateChange}
              onDayClick={handleDayClick}
            />
          </div>

          <div
            role="region"
            aria-label={msg.ariaEventMap}
            tabIndex={0}
            className={`explorer-shell__map ${mobilePanel !== "map" ? "explorer-shell__map--hidden-mobile" : ""}`}
          >
            <MapPanel
              markers={markers}
              selectedLocation={selectedMapLocation}
              syncToList={syncMapToList}
              onSyncToggle={setSyncMapToList}
              onBoundsChange={setMapBounds}
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
        .explorer-shell__header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--spacing-2, 8px);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
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
        .explorer-shell__calendar {
          flex: 1;
          overflow-y: auto;
          min-height: 200px;
        }
        .explorer-shell__map {
          height: 350px;
          flex-shrink: 0;
          border-top: 1px solid var(--color-border, #e5e7eb);
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
        /* Mobile: single panel with tab bar */
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
          .explorer-shell__sidebar,
          .explorer-shell__calendar,
          .explorer-shell__map {
            flex: 1;
            border: none;
          }
          .explorer-shell__sidebar--hidden-mobile,
          .explorer-shell__content--hidden-mobile,
          .explorer-shell__calendar--hidden-mobile,
          .explorer-shell__map--hidden-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
