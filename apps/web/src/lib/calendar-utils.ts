import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  getISOWeek,
  isSameDay,
  isSameMonth,
  isToday as dateFnsIsToday,
  format,
  parseISO,
  startOfDay,
  eachDayOfInterval,
  getHours,
  getMinutes,
} from "date-fns";
import type { EventSummary } from "@acroyoga/shared/types/events";
import type {
  CalendarDay,
  CalendarWeek,
  MonthGrid,
  WeekTimeSlot,
  AgendaDayGroup,
  CalendarViewMode,
} from "@acroyoga/shared/types/explorer";

const MAX_EVENTS_PER_CELL = 3;

export function buildMonthGrid(year: number, month: number, events: EventSummary[]): MonthGrid {
  const firstDay = new Date(year, month, 1);
  const monthStart = startOfMonth(firstDay);
  const monthEnd = endOfMonth(firstDay);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: CalendarWeek[] = [];
  let current = gridStart;

  while (current <= gridEnd) {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(current, i);
      const dayEvents = events.filter((e) => isSameDay(parseISO(e.startDatetime), date));
      const visibleCount = Math.min(dayEvents.length, MAX_EVENTS_PER_CELL);
      days.push({
        date,
        isCurrentMonth: isSameMonth(date, firstDay),
        isToday: dateFnsIsToday(date),
        events: dayEvents.slice(0, MAX_EVENTS_PER_CELL),
        overflowCount: Math.max(0, dayEvents.length - visibleCount),
      });
    }
    weeks.push({
      weekNumber: getISOWeek(days[0].date),
      days,
    });
    current = addDays(current, 7);
  }

  return { year, month, weeks };
}

export function buildWeekSlots(
  weekStart: Date,
  events: EventSummary[],
  slotMinutes: number = 30
): WeekTimeSlot[] {
  const slots: WeekTimeSlot[] = [];
  const totalSlots = (24 * 60) / slotMinutes;

  for (let i = 0; i < totalSlots; i++) {
    const startHour = Math.floor((i * slotMinutes) / 60);
    const startMin = (i * slotMinutes) % 60;
    const endHour = Math.floor(((i + 1) * slotMinutes) / 60);
    const endMin = ((i + 1) * slotMinutes) % 60;

    const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

    const slotEvents = events.filter((e) => {
      const eventDate = parseISO(e.startDatetime);
      const h = getHours(eventDate);
      const m = getMinutes(eventDate);
      const eventMinutes = h * 60 + m;
      const slotStart = i * slotMinutes;
      const slotEnd = (i + 1) * slotMinutes;
      return eventMinutes >= slotStart && eventMinutes < slotEnd;
    });

    slots.push({ startTime, endTime, events: slotEvents });
  }

  return slots;
}

export function getDateRangeForView(
  view: CalendarViewMode,
  referenceDate: Date
): { dateFrom: string; dateTo: string } {
  switch (view) {
    case "month": {
      const s = startOfMonth(referenceDate);
      const e = endOfMonth(referenceDate);
      return { dateFrom: format(s, "yyyy-MM-dd"), dateTo: format(e, "yyyy-MM-dd") };
    }
    case "week": {
      const s = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const e = endOfWeek(referenceDate, { weekStartsOn: 1 });
      return { dateFrom: format(s, "yyyy-MM-dd"), dateTo: format(e, "yyyy-MM-dd") };
    }
    case "list":
    case "agenda": {
      const s = startOfDay(referenceDate);
      const e = addDays(s, 30);
      return { dateFrom: format(s, "yyyy-MM-dd"), dateTo: format(e, "yyyy-MM-dd") };
    }
  }
}

export function groupEventsByDate(events: EventSummary[]): AgendaDayGroup[] {
  const grouped = new Map<string, EventSummary[]>();

  for (const event of events) {
    const dateKey = format(parseISO(event.startDatetime), "yyyy-MM-dd");
    const existing = grouped.get(dateKey) ?? [];
    existing.push(event);
    grouped.set(dateKey, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, evts]) => ({
      date: parseISO(dateStr),
      events: evts.sort(
        (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
      ),
    }));
}

export function isToday(date: Date): boolean {
  return dateFnsIsToday(date);
}

export function computeOverflow(totalEvents: number, maxVisible: number = MAX_EVENTS_PER_CELL): number {
  return Math.max(0, totalEvents - maxVisible);
}

export function navigateMonth(year: number, month: number, direction: "prev" | "next"): { year: number; month: number } {
  const date = new Date(year, month, 1);
  const newDate = direction === "next" ? addMonths(date, 1) : subMonths(date, 1);
  return { year: newDate.getFullYear(), month: newDate.getMonth() };
}
