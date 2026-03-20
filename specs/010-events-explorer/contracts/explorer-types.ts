/**
 * Client-Side Types: Events Explorer
 * Spec 010 — Type contracts for the Explorer panels, filter state, and derived structures
 *
 * These types live client-side. They consume data from existing API contracts
 * (events-api, cities-api from Spec 001) and derive Explorer-specific structures.
 */

import type { EventCategory, SkillLevel, EventSummary } from '../../../packages/shared/src/types/events';
import type { City } from '../../../packages/shared/src/types/cities';

// ─── Calendar View Modes ────────────────────────────────────────────

export type CalendarViewMode = 'month' | 'week' | 'list' | 'agenda';

// ─── Explorer Filter State (URL-synced) ─────────────────────────────

export interface ExplorerFilterState {
  /** Active category filters. Empty array = all categories enabled */
  categories: EventCategory[];
  /** Selected city slug from location tree */
  location: string | null;
  /** ISO 8601 date string — start of date range */
  dateFrom: string | null;
  /** ISO 8601 date string — end of date range */
  dateTo: string | null;
  /** Active calendar view */
  view: CalendarViewMode;
  /** Skill level filter */
  skillLevel: SkillLevel | null;
  /** Status pills (e.g., "new", "full", "past") */
  status: string[];
  /** Free-text search */
  q: string | null;
  /** Pagination */
  page: number;
}

export interface ExplorerFilterActions {
  /** Update a single filter key. Resets page to 1 unless key is 'page'. */
  setFilter: <K extends keyof ExplorerFilterState>(key: K, value: ExplorerFilterState[K]) => void;
  /** Toggle a category on/off in the active list */
  toggleCategory: (category: EventCategory) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Apply a date quick pick */
  applyQuickPick: (pick: DateQuickPick) => void;
}

export type DateQuickPick = 'this-week' | 'this-weekend' | 'this-month' | 'next-30-days';

// ─── Location Tree ──────────────────────────────────────────────────

export type LocationNodeType = 'continent' | 'country' | 'city';

export interface LocationNode {
  /** Unique hierarchical key (e.g., "EU", "EU/GB", "EU/GB/bristol") */
  id: string;
  /** Level in the hierarchy */
  type: LocationNodeType;
  /** Display name */
  name: string;
  /** City slug — null for continent/country nodes */
  slug: string | null;
  /** Identifier code (continent code, country code, or city slug) */
  code: string;
  /** Number of matching events at this level and below */
  eventCount: number;
  /** Center coordinates for map zoom targeting */
  latitude: number | null;
  longitude: number | null;
  /** Child nodes, sorted alphabetically by name */
  children: LocationNode[];
}

// ─── Calendar Data Structures ───────────────────────────────────────

export interface CalendarDay {
  /** The calendar date */
  date: Date;
  /** True if this day belongs to the currently viewed month */
  isCurrentMonth: boolean;
  /** True if this is today */
  isToday: boolean;
  /** Events on this specific day */
  events: EventSummary[];
  /** Number of events beyond the display limit (for "+N more" indicator) */
  overflowCount: number;
}

export interface CalendarWeek {
  /** ISO week number */
  weekNumber: number;
  /** 7 days of the week */
  days: CalendarDay[];
}

export interface MonthGrid {
  /** Year */
  year: number;
  /** Month (0-indexed) */
  month: number;
  /** 4–6 weeks of calendar data */
  weeks: CalendarWeek[];
}

export interface WeekTimeSlot {
  /** Slot start time (e.g., "09:00") */
  startTime: string;
  /** Slot end time (e.g., "09:30") */
  endTime: string;
  /** Events overlapping this time slot */
  events: EventSummary[];
}

export interface AgendaDayGroup {
  /** Date for this group */
  date: Date;
  /** Events on this day, sorted by start time */
  events: EventSummary[];
}

// ─── Map Data Structures ────────────────────────────────────────────

export interface MapMarkerData {
  /** Event ID — links back to EventSummary */
  eventId: string;
  /** Geographic coordinates */
  latitude: number;
  longitude: number;
  /** Category for marker color */
  category: EventCategory;
  /** Display fields for popup */
  title: string;
  date: string;
  venueName: string;
  cityName: string;
}

export interface MapBounds {
  /** Southwest corner */
  south: number;
  west: number;
  /** Northeast corner */
  north: number;
  east: number;
}

// ─── Category Color Configuration ───────────────────────────────────

export interface CategoryColorConfig {
  category: EventCategory;
  /** CSS custom property name (e.g., "--color-category-jam") */
  tokenName: string;
  /** i18n translation key (e.g., "category.jam") */
  labelKey: string;
}

/**
 * Static mapping of event categories to their design token CSS custom properties.
 * Values reference tokens defined in packages/tokens/src/color.tokens.json.
 */
export const CATEGORY_COLORS: readonly CategoryColorConfig[] = [
  { category: 'jam',              tokenName: '--color-category-jam',      labelKey: 'category.jam' },
  { category: 'workshop',        tokenName: '--color-category-workshop',  labelKey: 'category.workshop' },
  { category: 'class',           tokenName: '--color-category-class',     labelKey: 'category.class' },
  { category: 'festival',        tokenName: '--color-category-festival',  labelKey: 'category.festival' },
  { category: 'social',          tokenName: '--color-category-social',    labelKey: 'category.social' },
  { category: 'retreat',         tokenName: '--color-category-retreat',   labelKey: 'category.retreat' },
  { category: 'teacher_training', tokenName: '--color-category-training', labelKey: 'category.teacherTraining' },
] as const;

// ─── City Type Extension ────────────────────────────────────────────

/**
 * Extended City with continent info for location tree construction.
 * This is a backward-compatible extension of the existing City type.
 */
export interface CityWithContinent extends City {
  continentCode: string;
  continentName: string;
}

// ─── Responsive Layout ──────────────────────────────────────────────

export type ExplorerBreakpoint = 'mobile' | 'tablet' | 'desktop';

export type MobilePanel = 'list' | 'map' | 'filters';
