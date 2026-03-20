"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { MapMarkerData } from "@acroyoga/shared/types/explorer";
import { getCategoryColor } from "@/lib/category-colors";
import MapMarkerPopup from "./MapMarkerPopup";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";
import "leaflet/dist/leaflet.css";

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapPanelInnerProps {
  markers: MapMarkerData[];
  selectedLocation?: { lat: number; lng: number; zoom: number } | null;
  syncToList?: boolean;
  onSyncToggle?: (enabled: boolean) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

interface MarkerCluster {
  lat: number;
  lng: number;
  markers: MapMarkerData[];
}

/** Group nearby markers into clusters based on pixel distance at current zoom */
function clusterMarkers(markers: MapMarkerData[], map: L.Map, clusterRadius: number = 60): MarkerCluster[] {
  if (markers.length === 0) return [];
  const clusters: MarkerCluster[] = [];

  for (const marker of markers) {
    const point = map.latLngToContainerPoint([marker.latitude, marker.longitude]);
    let added = false;
    for (const cluster of clusters) {
      const clusterPoint = map.latLngToContainerPoint([cluster.lat, cluster.lng]);
      const dx = point.x - clusterPoint.x;
      const dy = point.y - clusterPoint.y;
      if (Math.sqrt(dx * dx + dy * dy) < clusterRadius) {
        cluster.markers.push(marker);
        // Update center to average
        cluster.lat = cluster.markers.reduce((s, m) => s + m.latitude, 0) / cluster.markers.length;
        cluster.lng = cluster.markers.reduce((s, m) => s + m.longitude, 0) / cluster.markers.length;
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({ lat: marker.latitude, lng: marker.longitude, markers: [marker] });
    }
  }
  return clusters;
}

function createCategoryIcon(category: string): L.DivIcon {
  const color = getCategoryColor(category as Parameters<typeof getCategoryColor>[0]);
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.2));"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function NearMeButton() {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNearMe() {
    if (!navigator.geolocation) {
      setError(msg.nearMeUnsupported);
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 12);
        setLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? msg.nearMeDenied : msg.nearMeFailed);
        setLoading(false);
        setTimeout(() => setError(null), 3000);
      },
      { timeout: 10000 }
    );
  }

  return (
    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}>
      <button
        onClick={handleNearMe}
        disabled={loading}
        aria-label={msg.ariaNearMe}
        style={{
          padding: "var(--spacing-2) var(--spacing-3)",
          backgroundColor: "var(--color-surface-background)",
          border: "1px solid var(--color-surface-border)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-sm)",
          cursor: loading ? "wait" : "pointer",
          minWidth: 44,
          minHeight: 44,
          boxShadow: "var(--shadow-md)",
        }}
      >
        {loading ? msg.nearMeLocating : msg.nearMeButton}
      </button>
      {error && (
        <div
          role="alert"
          style={{
            marginTop: "var(--spacing-1)",
            padding: "var(--spacing-2)",
            backgroundColor: "var(--color-semantic-warning)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-size-xs)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function BoundsReporter({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const reportBounds = useCallback((map: L.Map) => {
    const b = map.getBounds();
    onBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [onBoundsChange]);

  useMapEvents({
    moveend: (e) => reportBounds(e.target as L.Map),
    zoomend: (e) => reportBounds(e.target as L.Map),
  });

  return null;
}

function ClusteredMarkers({ markers }: { markers: MapMarkerData[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom()), // re-cluster on pan too
  });

  const clusters = useMemo(() => clusterMarkers(markers, map), [markers, zoom, map]);

  return (
    <>
      {clusters.map((cluster, i) => {
        if (cluster.markers.length === 1) {
          const m = cluster.markers[0];
          return (
            <Marker
              key={m.eventId}
              position={[m.latitude, m.longitude]}
              icon={createCategoryIcon(m.category)}
            >
              <Popup>
                <MapMarkerPopup marker={m} />
              </Popup>
            </Marker>
          );
        }

        const radius = Math.min(30, 16 + cluster.markers.length * 2);
        return (
          <CircleMarker
            key={`cluster-${i}`}
            center={[cluster.lat, cluster.lng]}
            radius={radius}
            pathOptions={{
              fillColor: "var(--color-brand-primary, #6366F1)",
              fillOpacity: 0.85,
              color: "#fff",
              weight: 2,
            }}
            eventHandlers={{
              click: () => {
                map.flyTo([cluster.lat, cluster.lng], map.getZoom() + 2);
              },
            }}
          >
            <Tooltip permanent direction="center" className="cluster-count-tooltip">
              {cluster.markers.length}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function MapPanelInner({
  markers,
  selectedLocation,
  syncToList = false,
  onSyncToggle,
  onBoundsChange,
}: MapPanelInnerProps) {
  const defaultCenter: [number, number] = [48, 10]; // Europe center default
  const defaultZoom = 4;

  return (
    <div
      style={{ height: "100%", width: "100%", position: "relative" }}
      role="img"
      aria-label={msg.mapLabel(markers.length)}
    >
      {onSyncToggle && (
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-1)",
              padding: "var(--spacing-1) var(--spacing-2)",
              backgroundColor: "var(--color-surface-background)",
              border: "1px solid var(--color-surface-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-xs)",
              boxShadow: "var(--shadow-md)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={syncToList}
              onChange={(e) => onSyncToggle(e.target.checked)}
            />
            {msg.syncMapToList}
          </label>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <NearMeButton />

        {onBoundsChange && syncToList && (
          <BoundsReporter onBoundsChange={onBoundsChange} />
        )}

        {selectedLocation && (
          <MapViewUpdater
            center={[selectedLocation.lat, selectedLocation.lng]}
            zoom={selectedLocation.zoom}
          />
        )}

        <ClusteredMarkers markers={markers} />
      </MapContainer>

      <style>{`
        .cluster-count-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: #fff !important;
          font-weight: 700;
          font-size: 13px;
          text-align: center;
        }
        .cluster-count-tooltip::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
