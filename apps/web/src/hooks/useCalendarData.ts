"use client";

import { useMemo } from "react";
import type { EventSummary } from "@acroyoga/shared/types/events";
import type {
  CalendarViewMode,
  MonthGrid,
  WeekTimeSlot,
  AgendaDayGroup,
} from "@acroyoga/shared/types/explorer";
import { buildMonthGrid, buildWeekSlots, groupEventsByDate } from "@/lib/calendar-utils";
import { parseISO, startOfWeek } from "date-fns";

interface CalendarData {
  monthGrid: MonthGrid | null;
  weekSlots: WeekTimeSlot[];
  agendaGroups: AgendaDayGroup[];
}

export function useCalendarData(
  view: CalendarViewMode,
  events: EventSummary[],
  dateFrom: string | null,
): CalendarData {
  const referenceDate = useMemo(() => {
    if (dateFrom) return parseISO(dateFrom);
    return new Date();
  }, [dateFrom]);

  const monthGrid = useMemo(() => {
    if (view !== "month") return null;
    return buildMonthGrid(referenceDate.getFullYear(), referenceDate.getMonth(), events);
  }, [view, referenceDate, events]);

  const weekSlots = useMemo(() => {
    if (view !== "week") return [];
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
    return buildWeekSlots(weekStart, events);
  }, [view, referenceDate, events]);

  const agendaGroups = useMemo(() => {
    if (view !== "agenda" && view !== "list") return [];
    return groupEventsByDate(events);
  }, [view, events]);

  return { monthGrid, weekSlots, agendaGroups };
}
