/**
 * All user-facing strings for the Events Explorer.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 */

export const EXPLORER_MESSAGES = {
  // Mobile tab labels
  tabCalendar: "Calendar",
  tabMap: "Map",
  tabFilters: "Filters",

  // Aria labels
  ariaExplorerPanels: "Explorer panels",
  ariaLocationFilter: "Location filter",
  ariaEventCalendar: "Event calendar",
  ariaEventMap: "Event map",
  ariaCalendarView: "Calendar view",
  ariaQuickDateFilters: "Quick date filters",
  ariaMonthView: "Calendar month view",
  ariaWeekView: "Calendar week view",
  ariaEventsList: "Events list",
  ariaAgendaView: "Agenda view",
  ariaPreviousMonth: "Previous month",
  ariaNextMonth: "Next month",
  ariaFilterLocations: "Filter locations",
  ariaNearMe: "Center map on my location",

  // Calendar view labels
  viewMonth: "Month",
  viewWeek: "Week",
  viewList: "List",
  viewAgenda: "Agenda",

  // Day headers
  dayMon: "Mon",
  dayTue: "Tue",
  dayWed: "Wed",
  dayThu: "Thu",
  dayFri: "Fri",
  daySat: "Sat",
  daySun: "Sun",

  // Quick pick labels
  quickPickThisWeek: "This Week",
  quickPickThisWeekend: "This Weekend",
  quickPickThisMonth: "This Month",
  quickPickNext30Days: "Next 30 Days",

  // Location tree
  loadingLocations: "Loading locations\u2026",
  filterLocationsPlaceholder: "Filter locations\u2026",

  // Loading / empty / error states
  loadingEvents: "Loading events\u2026",
  loadingEventsError: "Failed to load events",
  noEventsInPeriod: "No events in this period.",
  retryLoadEvents: "Retry",

  // Map
  nearMeButton: "\uD83D\uDCCD Near me",
  nearMeLocating: "Locating\u2026",
  nearMeUnsupported: "Geolocation not supported",
  nearMeDenied: "Location permission denied",
  nearMeFailed: "Could not get location",
  mapLabel: (count: number) =>
    `Map showing ${count} event${count !== 1 ? "s" : ""}`,

  // Calendar month grid
  overflow: (count: number) => `+${count} more`,
  dayEventCount: (day: string, count: number) =>
    count > 0 ? `${day}, ${count} events` : day,
  agendaDaySummary: (day: string, count: number) =>
    `${day} \u2014 ${count} event${count !== 1 ? "s" : ""}`,

  // Sync map toggle
  syncMapToList: "Sync map to list",

  // Reset filters
  resetFilters: "Reset filters",

  // Count toggles
  toggleCounts: "#",
  ariaToggleMapCounts: "Toggle event counts on map",
  ariaToggleCalendarCounts: "Toggle event counts on calendar",
  ariaToggleFilterCounts: "Toggle event counts on filters",

  // City-level event list
  cityEventsTitle: (city: string) => `Events in ${city}`,
  noCityEvents: "No events found.",
} as const;
