"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { EventDetail } from "@/types/events";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) throw new Error("Event not found");
        setEvent(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6" role="status" aria-label="Loading event">
        <div className="h-8 bg-gray-100 animate-pulse rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-100 animate-pulse rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-100 animate-pulse rounded w-1/3 mb-6" />
        <div className="h-48 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-red-600" role="alert">
        {error ?? "Event not found"}
      </div>
    );
  }

  const isFree = event.cost === 0;
  const isFull = event.confirmedCount >= event.capacity;
  const { roleBreakdown } = event;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{event.title}</h1>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
          {event.category.replace("_", " ")}
        </span>
        <span className="text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
          {event.skillLevel.replace("_", " ")}
        </span>
        {event.status === "cancelled" && (
          <span className="text-sm bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Cancelled</span>
        )}
      </div>

      {/* Date & Time */}
      <div className="mt-4 text-gray-700">
        <p>
          {new Date(event.startDatetime).toLocaleString()} — {new Date(event.endDatetime).toLocaleString()}
        </p>
      </div>

      {/* Venue & Map */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h2 className="font-semibold">{event.venue.name}</h2>
        <p className="text-sm text-gray-600">{event.venue.address}</p>
        <div className="flex gap-3 mt-2 text-sm">
          <a href={event.venue.mapLinks.google} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Maps</a>
          <a href={event.venue.mapLinks.apple} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Apple Maps</a>
          <a href={event.venue.mapLinks.osm} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenStreetMap</a>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="mt-4 prose prose-sm max-w-none">
          <p>{event.description}</p>
        </div>
      )}

      {/* Prerequisites */}
      {event.prerequisites && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <h3 className="font-semibold text-amber-800">Prerequisites</h3>
          <p className="text-sm text-amber-700 mt-1">{event.prerequisites}</p>
        </div>
      )}

      {/* Cost */}
      <div className="mt-4">
        <span className="text-xl font-bold">
          {isFree ? "Free" : `${event.currency} ${event.cost.toFixed(2)}`}
        </span>
        {event.concessionCost != null && (
          <span className="ml-2 text-sm text-gray-500">
            (Concession: {event.currency} {event.concessionCost.toFixed(2)})
          </span>
        )}
      </div>

      {/* RSVP / Capacity */}
      <div className="mt-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold">
            {event.confirmedCount} / {event.capacity} attending
          </span>
          {isFull && <span className="text-sm text-red-600 font-medium">Full</span>}
        </div>

        {/* Role breakdown */}
        <div className="flex gap-4 mt-2 text-sm text-gray-600">
          <span>Base: {roleBreakdown.base}</span>
          <span>Flyer: {roleBreakdown.flyer}</span>
          <span>Hybrid: {roleBreakdown.hybrid}</span>
        </div>
        {roleBreakdown.hint && (
          <p className="text-sm text-orange-600 font-medium mt-1">{roleBreakdown.hint}</p>
        )}
      </div>

      {/* Attendees */}
      {event.attendees.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold mb-2">Attendees</h2>
          <ul className="text-sm space-y-1">
            {event.attendees.map((a) => (
              <li key={a.userId}>
                {a.displayName} <span className="text-gray-400">({a.role})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <a
          href={`/api/events/${event.id}/ical`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          aria-label="Download calendar invite"
        >
          Add to Calendar
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          aria-label="Copy event link"
        >
          Share
        </button>
      </div>

      {/* Refund policy */}
      {!isFree && (
        <p className="mt-4 text-xs text-gray-400">
          Cancellation within {event.refundWindowHours}h of event start: credit or refund available.
          After that: no refund.
        </p>
      )}
    </div>
  );
}
