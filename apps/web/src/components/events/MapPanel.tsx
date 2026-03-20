"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LocationNode, MapMarkerData, MapZoomLevel } from "@acroyoga/shared/types/explorer";
import { getCategoryColor } from "@/lib/category-colors";
import { findNode, getNodeBounds } from "@/lib/location-hierarchy";
import { useCountToggle } from "@/hooks/useCountToggle";
import MapMarkerPopup from "./MapMarkerPopup";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";
import "leaflet/dist/leaflet.css";

/* ── Zoom thresholds (with hysteresis) ──────────────────────────── */
const ZOOM_UP_TO_COUNTRY = 5;
const ZOOM_UP_TO_CITY = 10;
const ZOOM_DOWN_TO_COUNTRY = 8;
const ZOOM_DOWN_TO_GLOBE = 3;

/* ── Props ──────────────────────────────────────────────────────── */
interface MapPanelProps {
  tree: LocationNode[];
  markers: MapMarkerData[];
  selectedLocation: string | null;
  onLocationSelect: (id: string | null) => void;
}

/* ── Clustering helper (city-level only) ────────────────────────── */
interface MarkerCluster { lat: number; lng: number; markers: MapMarkerData[] }

function clusterMarkers(markers: MapMarkerData[], map: L.Map, radius = 60): MarkerCluster[] {
  const clusters: MarkerCluster[] = [];
  for (const m of markers) {
    const pt = map.latLngToContainerPoint([m.latitude, m.longitude]);
    let added = false;
    for (const c of clusters) {
      const cp = map.latLngToContainerPoint([c.lat, c.lng]);
      if (Math.hypot(pt.x - cp.x, pt.y - cp.y) < radius) {
        c.markers.push(m);
        c.lat = c.markers.reduce((s, x) => s + x.latitude, 0) / c.markers.length;
        c.lng = c.markers.reduce((s, x) => s + x.longitude, 0) / c.markers.length;
        added = true;
        break;
      }
    }
    if (!added) clusters.push({ lat: m.latitude, lng: m.longitude, markers: [m] });
  }
  return clusters;
}

function createCategoryIcon(category: string): L.DivIcon {
  const color = getCategoryColor(category as Parameters<typeof getCategoryColor>[0]);
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.2);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

/* ── Derive current zoom level from a location id ────────────── */
function levelFromLocation(loc: string | null): MapZoomLevel {
  if (!loc) return "globe";
  const depth = loc.split("/").length;
  if (depth >= 3) return "city";
  if (depth >= 2) return "country";
  return "globe";
}

/* ── Sub-components rendered inside MapContainer ─────────────── */

/** Fly the map when selectedLocation changes (driven by tree clicks). */
function LocationSync({
  tree,
  selectedLocation,
  isSnapping,
}: {
  tree: LocationNode[];
  selectedLocation: string | null;
  isSnapping: React.RefObject<boolean>;
}) {
  const map = useMap();
  const prevLoc = useRef(selectedLocation);

  useEffect(() => {
    if (prevLoc.current === selectedLocation) return;
    prevLoc.current = selectedLocation;
    isSnapping.current = true;

    if (!selectedLocation) {
      map.flyTo([20, 0], 2, { duration: 0.6 });
    } else {
      const node = findNode(tree, selectedLocation);
      if (!node) { isSnapping.current = false; return; }

      // Cities: fly directly to point at zoom 12 (bounds would be too wide for a single coord)
      if (node.type === "city" && node.latitude != null && node.longitude != null) {
        map.flyTo([node.latitude, node.longitude], 12, { duration: 0.6 });
      } else {
        const bounds = getNodeBounds([node]);
        if (bounds) {
          map.flyToBounds(bounds, { padding: [30, 30], maxZoom: 14, duration: 0.6 });
        } else if (node.latitude != null && node.longitude != null) {
          map.flyTo([node.latitude, node.longitude], 6, { duration: 0.6 });
        }
      }
    }

    const timer = setTimeout(() => { isSnapping.current = false; }, 800);
    return () => clearTimeout(timer);
  }, [map, tree, selectedLocation, isSnapping]);

  return null;
}

/** Detect zoom threshold crossings and snap to the nearest hierarchical level. */
function ZoomSnapper({
  tree,
  selectedLocation,
  onLocationSelect,
  isSnapping,
}: {
  tree: LocationNode[];
  selectedLocation: string | null;
  onLocationSelect: (id: string | null) => void;
  isSnapping: React.RefObject<boolean>;
}) {
  const map = useMap();
  const prevLevel = useRef<MapZoomLevel>(levelFromLocation(selectedLocation));

  useMapEvents({
    zoomend: () => {
      if (isSnapping.current) return;
      const zoom = map.getZoom();
      const center = map.getCenter();
      const curLevel = prevLevel.current;

      // Globe → Country
      if (curLevel === "globe" && zoom >= ZOOM_UP_TO_COUNTRY) {
        const closest = findClosestCountry(tree, center.lat, center.lng);
        if (closest) {
          prevLevel.current = "country";
          onLocationSelect(closest.id);
          return;
        }
      }

      // Country → City
      if (curLevel === "country" && zoom >= ZOOM_UP_TO_CITY) {
        const countryNode = selectedLocation ? findNode(tree, selectedLocation) : null;
        if (countryNode) {
          const closest = findClosestChild(countryNode, center.lat, center.lng);
          if (closest) {
            prevLevel.current = "city";
            onLocationSelect(closest.id);
            return;
          }
        }
      }

      // City → Country
      if (curLevel === "city" && zoom < ZOOM_DOWN_TO_COUNTRY && selectedLocation) {
        const parts = selectedLocation.split("/");
        if (parts.length >= 3) {
          prevLevel.current = "country";
          onLocationSelect(parts.slice(0, 2).join("/"));
          return;
        }
      }

      // Country → Globe
      if (curLevel === "country" && zoom < ZOOM_DOWN_TO_GLOBE) {
        prevLevel.current = "globe";
        onLocationSelect(null);
      }
    },
  });

  // Keep prevLevel in sync with external location changes
  useEffect(() => {
    prevLevel.current = levelFromLocation(selectedLocation);
  }, [selectedLocation]);

  return null;
}

/** Renders country/city bubbles or event markers depending on the level. */
function LevelRenderer({
  tree,
  markers,
  selectedLocation,
  onLocationSelect,
  showCounts,
}: {
  tree: LocationNode[];
  markers: MapMarkerData[];
  selectedLocation: string | null;
  onLocationSelect: (id: string | null) => void;
  showCounts: boolean;
}) {
  const map = useMap();
  const level = levelFromLocation(selectedLocation);
  const [tick, setTick] = useState(0);

  // Re-render when zoom/pan changes (for clustering) — must be called unconditionally
  useMapEvents({
    zoomend: () => setTick((t) => t + 1),
    moveend: () => setTick((t) => t + 1),
  });

  // Compute clusters unconditionally (avoids hook-order changes between levels)
  const clusters = useMemo(
    () => clusterMarkers(markers, map),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markers, tick, map],
  );

  // Globe level: show country bubbles
  if (level === "globe") {
    const countries = tree.flatMap((continent) => continent.children);
    return (
      <>
        {countries
          .filter((c) => c.eventCount > 0 && c.latitude != null && c.longitude != null)
          .map((country) => (
            <CircleMarker
              key={country.id}
              center={[country.latitude!, country.longitude!]}
              radius={Math.min(30, 12 + country.eventCount)}
              pathOptions={{ fillColor: "#6366F1", fillOpacity: 0.8, color: "#fff", weight: 2 }}
              eventHandlers={{
                click: () => onLocationSelect(country.id),
                mouseover: (e) => e.target.openPopup(),
                mouseout: (e) => e.target.closePopup(),
              }}
            >
              {showCounts && (
                <Tooltip permanent direction="center" className="bubble-count-tooltip">
                  {country.eventCount}
                </Tooltip>
              )}
              <Popup closeButton={false} autoPan={false} className="map-hover-popup">
                {country.name}
              </Popup>
            </CircleMarker>
          ))}
      </>
    );
  }

  // Country level: show city bubbles within the selected country
  if (level === "country" && selectedLocation) {
    const countryNode = findNode(tree, selectedLocation);
    const cities = countryNode?.children ?? [];
    return (
      <>
        {cities
          .filter((c) => c.eventCount > 0 && c.latitude != null && c.longitude != null)
          .map((city) => (
            <CircleMarker
              key={city.id}
              center={[city.latitude!, city.longitude!]}
              radius={Math.min(30, 12 + city.eventCount)}
              pathOptions={{ fillColor: "#6366F1", fillOpacity: 0.8, color: "#fff", weight: 2 }}
              eventHandlers={{
                click: () => onLocationSelect(city.id),
                mouseover: (e) => e.target.openPopup(),
                mouseout: (e) => e.target.closePopup(),
              }}
            >
              {showCounts && (
                <Tooltip permanent direction="center" className="bubble-count-tooltip">
                  {city.eventCount}
                </Tooltip>
              )}
              <Popup closeButton={false} autoPan={false} className="map-hover-popup">
                {city.name}
              </Popup>
            </CircleMarker>
          ))}
      </>
    );
  }

  // City level: show clustered event markers
  return (
    <>
      {clusters.map((cluster, i) => {
        if (cluster.markers.length === 1) {
          const m = cluster.markers[0];
          return (
            <Marker key={m.eventId} position={[m.latitude, m.longitude]} icon={createCategoryIcon(m.category)}>
              <Popup><MapMarkerPopup marker={m} /></Popup>
            </Marker>
          );
        }
        return (
          <CircleMarker
            key={`cl-${i}`}
            center={[cluster.lat, cluster.lng]}
            radius={Math.min(30, 14 + cluster.markers.length * 2)}
            pathOptions={{ fillColor: "#6366F1", fillOpacity: 0.85, color: "#fff", weight: 2 }}
            eventHandlers={{ click: () => map.flyTo([cluster.lat, cluster.lng], map.getZoom() + 2) }}
          >
            {showCounts && (
              <Tooltip permanent direction="center" className="bubble-count-tooltip">
                {cluster.markers.length}
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}
    </>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */

function findClosestCountry(tree: LocationNode[], lat: number, lng: number): LocationNode | null {
  let best: LocationNode | null = null;
  let bestDist = Infinity;
  for (const continent of tree) {
    for (const country of continent.children) {
      if (country.latitude == null || country.longitude == null || country.eventCount === 0) continue;
      const d = Math.hypot(country.latitude - lat, country.longitude - lng);
      if (d < bestDist) { bestDist = d; best = country; }
    }
  }
  return best;
}

function findClosestChild(parent: LocationNode, lat: number, lng: number): LocationNode | null {
  let best: LocationNode | null = null;
  let bestDist = Infinity;
  for (const child of parent.children) {
    if (child.latitude == null || child.longitude == null || child.eventCount === 0) continue;
    const d = Math.hypot(child.latitude - lat, child.longitude - lng);
    if (d < bestDist) { bestDist = d; best = child; }
  }
  return best;
}

/* ── Main component ─────────────────────────────────────────────── */

export default function MapPanelInner({ tree, markers, selectedLocation, onLocationSelect }: MapPanelProps) {
  const isSnapping = useRef(false);
  const [showCounts, toggleCounts] = useCountToggle("explorer.showCounts.map");

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }} role="img" aria-label={msg.mapLabel(markers.length)}>
      <button
        onClick={toggleCounts}
        aria-label={msg.ariaToggleMapCounts}
        aria-pressed={showCounts}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          width: 32,
          height: 32,
          borderRadius: "var(--radius-md, 6px)",
          border: "1px solid var(--color-border, #d1d5db)",
          background: showCounts ? "var(--color-brand-primary, #6366F1)" : "var(--color-surface-background, #fff)",
          color: showCounts ? "#fff" : "var(--color-surface-foreground, #333)",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      >
        {msg.toggleCounts}
      </button>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationSync tree={tree} selectedLocation={selectedLocation} isSnapping={isSnapping} />
        <ZoomSnapper tree={tree} selectedLocation={selectedLocation} onLocationSelect={onLocationSelect} isSnapping={isSnapping} />
        <LevelRenderer tree={tree} markers={markers} selectedLocation={selectedLocation} onLocationSelect={onLocationSelect} showCounts={showCounts} />
      </MapContainer>

      <style>{`
        .bubble-count-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: #fff !important;
          font-weight: 700;
          font-size: 13px;
          text-align: center;
        }
        .bubble-count-tooltip::before {
          display: none !important;
        }
        .map-hover-popup .leaflet-popup-content-wrapper {
          background: rgba(0,0,0,0.8);
          color: #fff;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .map-hover-popup .leaflet-popup-content {
          margin: 4px 0;
        }
        .map-hover-popup .leaflet-popup-tip {
          background: rgba(0,0,0,0.8);
        }
      `}</style>
    </div>
  );
}
