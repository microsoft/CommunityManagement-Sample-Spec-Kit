"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import EventCard from "@/components/events/EventCard";
import EventFilters from "@/components/events/EventFilters";
import type { EventSummary } from "@/types/events";

export default function EventsListPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/events?${searchParams.toString()}`);
        if (!res.ok) throw new Error("Failed to load events");
        const data = await res.json();
        setEvents(data.events);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [searchParams]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Events</h1>

      <EventFilters />

      {loading && (
        <div className="mt-6 space-y-4" role="status" aria-label="Loading events">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 text-red-600" role="alert">
          {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="mt-4 text-sm text-gray-500">{total} events found</p>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {events.length === 0 && (
            <p className="mt-8 text-center text-gray-400">No events match your filters.</p>
          )}
        </>
      )}
    </div>
  );
}
