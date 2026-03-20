import type { EventCategory, SkillLevel, EventSummary } from "./events";
import type { City } from "./cities";

// ─── Calendar View Modes ────────────────────────────────────────────

export type CalendarViewMode = "month" | "week" | "list" | "agenda";

// ─── Explorer Filter State (URL-synced) ─────────────────────────────

export interface ExplorerFilterState {
  categories: EventCategory[];
  location: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  view: CalendarViewMode;
  skillLevel: SkillLevel | null;
  status: string[];
  q: string | null;
  page: number;
}

export interface ExplorerFilterActions {
  setFilter: <K extends keyof ExplorerFilterState>(key: K, value: ExplorerFilterState[K]) => void;
  toggleCategory: (category: EventCategory) => void;
  resetFilters: () => void;
  applyQuickPick: (pick: DateQuickPick) => void;
}

export type DateQuickPick = "this-week" | "this-weekend" | "this-month" | "next-30-days";

// ─── Location Tree ──────────────────────────────────────────────────

export type LocationNodeType = "continent" | "country" | "city";

export interface LocationNode {
  id: string;
  type: LocationNodeType;
  name: string;
  slug: string | null;
  code: string;
  eventCount: number;
  latitude: number | null;
  longitude: number | null;
  children: LocationNode[];
}

// ─── Calendar Data Structures ───────────────────────────────────────

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: EventSummary[];
  overflowCount: number;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface MonthGrid {
  year: number;
  month: number;
  weeks: CalendarWeek[];
}

export interface WeekTimeSlot {
  startTime: string;
  endTime: string;
  events: EventSummary[];
}

export interface AgendaDayGroup {
  date: Date;
  events: EventSummary[];
}

// ─── Map Data Structures ────────────────────────────────────────────

export interface MapMarkerData {
  eventId: string;
  latitude: number;
  longitude: number;
  category: EventCategory;
  title: string;
  date: string;
  venueName: string;
  cityName: string;
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

// ─── Category Color Configuration ───────────────────────────────────

export interface CategoryColorConfig {
  category: EventCategory;
  tokenName: string;
  labelKey: string;
}

// ─── City Type Extension ────────────────────────────────────────────

export interface CityWithContinent extends City {
  continentCode: string;
  continentName: string;
}

// ─── Responsive Layout ──────────────────────────────────────────────

export type ExplorerBreakpoint = "mobile" | "tablet" | "desktop";
export type MobilePanel = "list" | "map" | "filters";
