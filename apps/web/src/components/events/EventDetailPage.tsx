"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import type { EventDetail } from "@acroyoga/shared/types/events";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { EVENT_MESSAGES as msg } from "./event-messages";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
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
        <div className="h-8 bg-muted animate-pulse rounded w-2/3 mb-4" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2 mb-2" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/3 mb-6" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-danger" role="alert">
        {error ?? msg.eventNotFound}
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
        <span className="text-sm bg-info/10 text-info px-2 py-0.5 rounded-full">
          {event.category.replace("_", " ")}
        </span>
        <span className="text-sm bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {event.skillLevel.replace("_", " ")}
        </span>
        {event.status === "cancelled" && (
          <span className="text-sm bg-danger/10 text-danger px-2 py-0.5 rounded-full">{msg.cancelled}</span>
        )}
      </div>

      {/* Date & Time */}
      <div className="mt-4 text-foreground">
        <p>
          {formatEventDate(event.startDatetime, locale)} — {formatEventDate(event.endDatetime, locale)}
        </p>
      </div>

      {/* Venue & Map */}
      <div className="mt-4 p-4 bg-muted rounded-lg">
        <h2 className="font-semibold">{event.venue.name}</h2>
        <p className="text-sm text-muted-foreground">{event.venue.address}</p>
        <div className="flex gap-3 mt-2 text-sm">
          <a href={event.venue.mapLinks.google} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{msg.googleMaps}</a>
          <a href={event.venue.mapLinks.apple} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{msg.appleMaps}</a>
          <a href={event.venue.mapLinks.osm} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{msg.openStreetMap}</a>
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
        <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded">
          <h3 className="font-semibold text-warning">{msg.prerequisites}</h3>
          <p className="text-sm text-warning mt-1">{event.prerequisites}</p>
        </div>
      )}

      {/* Cost */}
      <div className="mt-4">
        <span className="text-xl font-bold">
          {isFree ? msg.free : `${event.currency} ${event.cost.toFixed(2)}`}
        </span>
        {event.concessionCost != null && (
          <span className="ms-2 text-sm text-muted-foreground">
            {msg.concessionLabel(event.currency, event.concessionCost.toFixed(2))}
          </span>
        )}
      </div>

      {/* RSVP / Capacity */}
      <div className="mt-4 p-4 border rounded-lg" aria-live="assertive" aria-atomic="true">
        <div className="flex items-center justify-between">
          <span className="font-semibold">
            {event.confirmedCount} / {event.capacity} {msg.attending}
          </span>
          {isFull && <span className="text-sm text-danger font-medium">{msg.badgeFull}</span>}
        </div>

        {/* Role breakdown */}
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>{msg.roleBase}: {roleBreakdown.base}</span>
          <span>{msg.roleFlyer}: {roleBreakdown.flyer}</span>
          <span>{msg.roleHybrid}: {roleBreakdown.hybrid}</span>
        </div>
        {roleBreakdown.hint && (
          <p className="text-sm text-warning font-medium mt-1">{roleBreakdown.hint}</p>
        )}
      </div>

      {/* Attendees */}
      {event.attendees.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold mb-2">{msg.attendees}</h2>
          <ul className="text-sm space-y-1">
            {event.attendees.map((a) => (
              <li key={a.userId}>
                {a.displayName} <span className="text-muted-foreground">({a.role})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <a
          href={`/api/events/${event.id}/ical`}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover text-sm"
          aria-label="Download calendar invite"
        >
          {msg.addToCalendar}
        </a>
      </div>

      {/* Refund policy */}
      {!isFree && (
        <p className="mt-4 text-xs text-muted-foreground">
          {msg.refundPolicy(event.refundWindowHours)}
        </p>
      )}
    </div>
  );
}
