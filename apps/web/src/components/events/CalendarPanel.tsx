"use client";

import React, { useMemo } from "react";
import type { EventSummary } from "@acroyoga/shared/types/events";
import type { MonthGrid } from "@acroyoga/shared/types/explorer";
import { useCalendarData } from "@/hooks/useCalendarData";
import { getCategoryColor } from "@/lib/category-colors";
import { navigateMonth } from "@/lib/calendar-utils";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { EXPLORER_MESSAGES as msg } from "./explorer-messages";

interface CalendarPanelProps {
  events: EventSummary[];
  dateFrom: string | null;
  onDateChange: (dateFrom: string, dateTo: string) => void;
  onDayClick?: (dateFrom: string, dateTo: string) => void;
}

const DAY_HEADERS = [msg.dayMon, msg.dayTue, msg.dayWed, msg.dayThu, msg.dayFri, msg.daySat, msg.daySun];

export default function CalendarPanel({
  events,
  dateFrom,
  onDateChange,
  onDayClick,
}: CalendarPanelProps) {
  const { monthGrid } = useCalendarData("month", events, dateFrom);

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

  function handleDayClick(date: Date) {
    if (onDayClick) {
      onDayClick(startOfDay(date).toISOString(), endOfDay(date).toISOString());
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header with month nav */}
      <div className="flex items-center justify-between" style={{ padding: "var(--spacing-3)" }}>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Month view */}
      <div className="flex-1 overflow-auto" style={{ padding: "0 var(--spacing-3) var(--spacing-3)" }}>
        {monthGrid && <MonthView grid={monthGrid} onDayClick={handleDayClick} />}
      </div>
    </div>
  );
}

function MonthView({ grid, onDayClick }: { grid: MonthGrid; onDayClick: (date: Date) => void }) {
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
              onClick={() => onDayClick(day.date)}
              style={{
                padding: "var(--spacing-1)",
                minHeight: 64,
                border: "1px solid var(--color-surface-border)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: day.isToday
                  ? "var(--color-brand-primary)"
                  : day.isCurrentMonth
                  ? "var(--color-surface-background)"
                  : "var(--color-surface-muted)",
                opacity: day.isCurrentMonth ? 1 : 0.5,
                cursor: "pointer",
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
