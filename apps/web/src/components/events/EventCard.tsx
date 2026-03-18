"use client";

import type { EventSummary } from "@acroyoga/shared/types/events";
import Link from "next/link";

interface EventCardProps {
  event: EventSummary;
}

const categoryColors: Record<string, string> = {
  jam: "bg-purple-100 text-purple-800",
  workshop: "bg-blue-100 text-blue-800",
  class: "bg-green-100 text-green-800",
  festival: "bg-yellow-100 text-yellow-800",
  social: "bg-pink-100 text-pink-800",
  retreat: "bg-indigo-100 text-indigo-800",
  teacher_training: "bg-orange-100 text-orange-800",
};

const skillColors: Record<string, string> = {
  beginner: "bg-green-50 text-green-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced: "bg-red-50 text-red-700",
  all_levels: "bg-gray-50 text-gray-700",
};

export default function EventCard({ event }: EventCardProps) {
  const isFull = event.confirmedCount >= event.capacity;
  const isFree = event.cost === 0;
  const startDate = new Date(event.startDatetime);

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
      aria-label={`${event.title} - ${event.category} in ${event.cityName}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{event.title}</h3>

          <p className="text-sm text-muted-foreground mt-1">
            {startDate.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <p className="text-sm text-muted-foreground mt-0.5">
            {event.venueName} · {event.cityName}
          </p>
        </div>

        {event.posterImageUrl && (
          <img
            src={event.posterImageUrl}
            alt=""
            className="w-16 h-16 rounded-md object-cover ml-3 flex-shrink-0"
          />
        )}
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[event.category] ?? "bg-muted"}`}>
          {event.category.replace("_", " ")}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${skillColors[event.skillLevel] ?? "bg-muted"}`}>
          {event.skillLevel.replace("_", " ")}
        </span>

        {event.isNew && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">New</span>
        )}
        {event.isUpdated && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">Updated</span>
        )}
        {isFull && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-danger/10 text-danger">Full</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="font-medium">
          {isFree ? "Free" : `${event.currency} ${event.cost.toFixed(2)}`}
        </span>
        <span className="text-muted-foreground">
          {event.confirmedCount}/{event.capacity} attending
          {event.interestedCount > 0 && ` · ${event.interestedCount} interested`}
        </span>
      </div>
    </Link>
  );
}
