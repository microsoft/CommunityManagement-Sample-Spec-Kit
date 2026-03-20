"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { EventSummary, EventSummaryWithCoords } from "@acroyoga/shared/types/events";
import ExplorerShell from "./ExplorerShell";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";

export default function ExplorerPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [coordEvents, setCoordEvents] = useState<EventSummaryWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(searchParams.toString());
      // Parse hierarchical location into API-compatible city/country params
      const location = params.get("location");
      params.delete("location");
      if (location) {
        const parts = location.split("/");
        if (parts.length >= 3) params.set("city", parts[2]);
        else if (parts.length === 2) params.set("country", parts[1]);
      }
      // Strip UI-only params the API doesn't understand
      params.delete("view");
      params.delete("categories");
      params.set("pageSize", "100");
      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error(msg.loadingEventsError);
      const data = await res.json();
      setEvents(data.events ?? []);
      setCoordEvents(data.events ?? []);
    } catch {
      setEvents([]);
      setCoordEvents([]);
      setError(msg.loadingEventsError);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <span>{msg.loadingEvents}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "var(--spacing-3)",
        }}
      >
        <p style={{ color: "var(--color-semantic-error, #dc2626)" }}>{error}</p>
        <button
          onClick={() => fetchEvents()}
          style={{
            padding: "var(--spacing-2) var(--spacing-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            cursor: "pointer",
          }}
        >
          {msg.retryLoadEvents}
        </button>
      </div>
    );
  }

  return <ExplorerShell events={events} coordEvents={coordEvents} />;
}
