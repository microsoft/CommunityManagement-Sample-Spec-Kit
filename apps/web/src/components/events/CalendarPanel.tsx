"use client";

import React, { useMemo } from "react";
import type { EventSummary } from "@acroyoga/shared/types/events";
import type { MonthGrid } from "@acroyoga/shared/types/explorer";
import { useCalendarData } from "@/hooks/useCalendarData";
import { navigateMonth } from "@/lib/calendar-utils";
import { useCountToggle } from "@/hooks/useCountToggle";
import { format, parseISO, startOfDay, endOfDay, isSameDay } from "date-fns";
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
  const [showCounts, toggleCounts] = useCountToggle("explorer.showCounts.calendar");

  const referenceDate = useMemo(() => {
    if (dateFrom) return parseISO(dateFrom);
    return new Date();
  }, [dateFrom]);

  const selectedDay = useMemo(() => {
    if (!dateFrom) return null;
    return parseISO(dateFrom);
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header with month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px", gap: 4 }}>
        <button
          onClick={toggleCounts}
          aria-label={msg.ariaToggleCalendarCounts}
          aria-pressed={showCounts}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-md, 6px)",
            border: "1px solid var(--color-border, #d1d5db)",
            background: showCounts ? "var(--color-brand-primary, #6366F1)" : "var(--color-surface-background, #fff)",
            color: showCounts ? "#fff" : "var(--color-surface-foreground, #333)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {msg.toggleCounts}
        </button>
        <button
          onClick={() => handleMonthNav("prev")}
          aria-label={msg.ariaPreviousMonth}
          style={{ padding: "2px 6px", minWidth: 32, minHeight: 32, background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
        >
          ←
        </button>
        <span style={{ minWidth: 130, textAlign: "center", fontWeight: 600, fontSize: 14 }}>
          {format(referenceDate, "MMMM yyyy")}
        </span>
        <button
          onClick={() => handleMonthNav("next")}
          aria-label={msg.ariaNextMonth}
          style={{ padding: "2px 6px", minWidth: 32, minHeight: 32, background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
        >
          →
        </button>
      </div>

      {/* Month view — fills remaining space, no scroll */}
      <div style={{ flex: 1, minHeight: 0, padding: "0 4px 4px" }}>
        {monthGrid && <MonthView grid={monthGrid} selectedDay={selectedDay} onDayClick={handleDayClick} showCounts={showCounts} />}
      </div>
    </div>
  );
}

function MonthView({ grid, selectedDay, onDayClick, showCounts }: { grid: MonthGrid; selectedDay: Date | null; onDayClick: (date: Date) => void; showCounts: boolean }) {
  return (
    <div role="grid" aria-label={msg.ariaMonthView} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        role="row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
        }}
      >
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            role="columnheader"
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 0",
              color: "var(--color-surface-muted-foreground)",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {grid.weeks.map((week) => (
          <div
            key={week.weekNumber}
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              flex: 1,
              minHeight: 0,
            }}
          >
            {week.days.map((day) => {
              const isSelected = selectedDay != null && isSameDay(day.date, selectedDay);
              const totalEvents = day.events.length + day.overflowCount;
              return (
                <div
                  key={day.date.toISOString()}
                  role="gridcell"
                  aria-label={msg.dayEventCount(format(day.date, "EEEE, MMMM d"), totalEvents)}
                  aria-selected={isSelected}
                  onClick={() => onDayClick(day.date)}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    borderRadius: 4,
                    backgroundColor: isSelected
                      ? "var(--color-brand-primary-light, #e0e7ff)"
                      : day.isCurrentMonth
                      ? "var(--color-surface-background)"
                      : "var(--color-surface-muted)",
                    opacity: day.isCurrentMonth ? 1 : 0.4,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Day number */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : day.isToday ? 600 : 400,
                      color: isSelected
                        ? "var(--color-brand-primary, #6366F1)"
                        : "var(--color-surface-foreground)",
                      lineHeight: 1,
                      borderBottom: day.isToday ? "2px solid var(--color-brand-primary, #6366F1)" : "2px solid transparent",
                      paddingBottom: 1,
                    }}
                  >
                    {day.date.getDate()}
                  </span>
                  {/* Event count bubble — next to date number */}
                  {showCounts && totalEvents > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: "var(--color-brand-primary, #6366F1)",
                        color: "#fff",
                        fontSize: 8,
                        fontWeight: 700,
                        lineHeight: 1,
                        padding: "0 2px",
                      }}
                    >
                      {totalEvents}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
