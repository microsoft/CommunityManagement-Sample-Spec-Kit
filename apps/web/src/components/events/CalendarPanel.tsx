"use client";

import React, { useMemo } from "react";
import type { EventSummary } from "@acroyoga/shared/types/events";
import type { CalendarViewMode, MonthGrid, AgendaDayGroup } from "@acroyoga/shared/types/explorer";
import { useCalendarData } from "@/hooks/useCalendarData";
import { getCategoryColor } from "@/lib/category-colors";
import { navigateMonth } from "@/lib/calendar-utils";
import { format, parseISO } from "date-fns";
import EventCard from "@/components/events/EventCard";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";

interface CalendarPanelProps {
  view: CalendarViewMode;
  events: EventSummary[];
  dateFrom: string | null;
  onViewChange: (view: CalendarViewMode) => void;
  onDateChange: (dateFrom: string, dateTo: string) => void;
}

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  month: msg.viewMonth,
  week: msg.viewWeek,
  list: msg.viewList,
  agenda: msg.viewAgenda,
};

const DAY_HEADERS = [msg.dayMon, msg.dayTue, msg.dayWed, msg.dayThu, msg.dayFri, msg.daySat, msg.daySun];

export default function CalendarPanel({
  view,
  events,
  dateFrom,
  onViewChange,
  onDateChange,
}: CalendarPanelProps) {
  const { monthGrid, weekSlots, agendaGroups } = useCalendarData(view, events, dateFrom);

  const referenceDate = useMemo(() => {
    if (dateFrom) return parseISO(dateFrom);
    return new Date();
  }, [dateFrom]);

  function handleMonthNav(direction: "prev" | "next") {
    const { year, month } = navigateMonth(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      direction
    );
    const newDate = new Date(year, month, 1);
    onDateChange(newDate.toISOString(), new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString());
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header with view switcher */}
      <div className="flex items-center justify-between" style={{ padding: "var(--spacing-3)" }}>
        <div className="flex items-center gap-2">
          {view === "month" && (
            <>
              <button
                onClick={() => handleMonthNav("prev")}
                aria-label={msg.ariaPreviousMonth}
                style={{ padding: "var(--spacing-1) var(--spacing-2)", minWidth: 44, minHeight: 44 }}
              >
                ←
              </button>
              <h2 className="text-lg font-semibold" style={{ minWidth: 160, textAlign: "center" }}>
                {format(referenceDate, "MMMM yyyy")}
              </h2>
              <button
                onClick={() => handleMonthNav("next")}
                aria-label={msg.ariaNextMonth}
                style={{ padding: "var(--spacing-1) var(--spacing-2)", minWidth: 44, minHeight: 44 }}
              >
                →
              </button>
            </>
          )}
          {view !== "month" && (
            <h2 className="text-lg font-semibold">
              {format(referenceDate, "MMMM yyyy")}
            </h2>
          )}
        </div>

        <div className="flex gap-1" role="tablist" aria-label={msg.ariaCalendarView}>
          {(Object.keys(VIEW_LABELS) as CalendarViewMode[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={v === view}
              onClick={() => onViewChange(v)}
              style={{
                padding: "var(--spacing-1) var(--spacing-3)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                fontWeight: v === view ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                backgroundColor: v === view ? "var(--color-brand-primary)" : "transparent",
                color: v === view ? "#fff" : "var(--color-surface-foreground)",
                border: "none",
                cursor: "pointer",
                minWidth: 44,
                minHeight: 44,
              }}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-auto" style={{ padding: "0 var(--spacing-3) var(--spacing-3)" }}>
        {view === "month" && monthGrid && <MonthView grid={monthGrid} />}
        {view === "week" && <WeekView slots={weekSlots} referenceDate={referenceDate} events={events} />}
        {view === "list" && <ListView groups={agendaGroups} />}
        {view === "agenda" && <AgendaView groups={agendaGroups} />}
      </div>
    </div>
  );
}

function MonthView({ grid }: { grid: MonthGrid }) {
  return (
    <div role="grid" aria-label={msg.ariaMonthView}>
      <div
        role="row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px",
        }}
      >
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            role="columnheader"
            style={{
              textAlign: "center",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              padding: "var(--spacing-1)",
              color: "var(--color-surface-muted-foreground)",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {grid.weeks.map((week) => (
        <div
          key={week.weekNumber}
          role="row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px",
          }}
        >
          {week.days.map((day) => (
            <div
              key={day.date.toISOString()}
              role="gridcell"
              aria-label={msg.dayEventCount(format(day.date, "EEEE, MMMM d"), day.events.length)}
              style={{
                padding: "var(--spacing-1)",
                minHeight: 80,
                border: "1px solid var(--color-surface-border)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: day.isToday
                  ? "var(--color-brand-primary)"
                  : day.isCurrentMonth
                  ? "var(--color-surface-background)"
                  : "var(--color-surface-muted)",
                opacity: day.isCurrentMonth ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: day.isToday ? "var(--font-weight-bold)" : "var(--font-weight-normal)",
                  color: day.isToday ? "#fff" : "var(--color-surface-foreground)",
                  marginBottom: "var(--spacing-1)",
                }}
              >
                {day.date.getDate()}
              </div>
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {day.events.map((event) => (
                  <span
                    key={event.id}
                    title={event.title}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: getCategoryColor(event.category),
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>
              {day.overflowCount > 0 && (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-surface-muted-foreground)" }}>
                  +{day.overflowCount} more
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function WeekView({
  slots,
  referenceDate,
  events,
}: {
  slots: { startTime: string; endTime: string; events: EventSummary[] }[];
  referenceDate: Date;
  events: EventSummary[];
}) {
  // Show only 6am-10pm slots for readability
  const visibleSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(":")[0], 10);
    return hour >= 6 && hour < 22;
  });

  return (
    <div role="grid" aria-label={msg.ariaWeekView}>
      {visibleSlots.map((slot) => (
        <div
          key={slot.startTime}
          role="row"
          style={{
            display: "flex",
            alignItems: "stretch",
            borderBottom: "1px solid var(--color-surface-border)",
            minHeight: 32,
          }}
        >
          <div
            style={{
              width: 60,
              fontSize: "var(--font-size-xs)",
              color: "var(--color-surface-muted-foreground)",
              padding: "var(--spacing-1)",
              flexShrink: 0,
            }}
          >
            {slot.startTime}
          </div>
          <div style={{ flex: 1, display: "flex", gap: 4, padding: "var(--spacing-1)", flexWrap: "wrap" }}>
            {slot.events.map((event) => (
              <div
                key={event.id}
                style={{
                  backgroundColor: getCategoryColor(event.category),
                  color: "#fff",
                  fontSize: "var(--font-size-xs)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 200,
                }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ groups }: { groups: AgendaDayGroup[] }) {
  if (groups.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-8)", color: "var(--color-surface-muted-foreground)" }}>
        {msg.noEventsInPeriod}
      </div>
    );
  }

  return (
    <div role="list" aria-label="Events list">
      {groups.map((group) => (
        <div key={group.date.toISOString()} role="listitem" style={{ marginBottom: "var(--spacing-4)" }}>
          <h3
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-surface-muted-foreground)",
              padding: "var(--spacing-2) 0",
              borderBottom: "1px solid var(--color-surface-border)",
            }}
          >
            {format(group.date, "EEEE, MMMM d, yyyy")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)", marginTop: "var(--spacing-2)" }}>
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgendaView({ groups }: { groups: AgendaDayGroup[] }) {
  if (groups.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-8)", color: "var(--color-surface-muted-foreground)" }}>
        {msg.noEventsInPeriod}
      </div>
    );
  }

  return (
    <div role="list" aria-label="Agenda view">
      {groups.map((group) => (
        <details
          key={group.date.toISOString()}
          role="listitem"
          open
          style={{ marginBottom: "var(--spacing-3)" }}
        >
          <summary
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
              padding: "var(--spacing-2)",
              backgroundColor: "var(--color-surface-muted)",
              borderRadius: "var(--radius-sm)",
              minHeight: 44,
              display: "flex",
              alignItems: "center",
            }}
          >
            {format(group.date, "EEEE, MMMM d")} — {group.events.length} event{group.events.length !== 1 ? "s" : ""}
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)", marginTop: "var(--spacing-2)", paddingLeft: "var(--spacing-4)" }}>
            {group.events.map((event) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-2)",
                  padding: "var(--spacing-2)",
                  borderLeft: `3px solid ${getCategoryColor(event.category)}`,
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-surface-muted-foreground)", width: 50 }}>
                  {format(parseISO(event.startDatetime), "HH:mm")}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>{event.title}</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-surface-muted-foreground)" }}>
                    {event.venueName} · {event.cityName}
                  </div>
                </div>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: getCategoryColor(event.category),
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
