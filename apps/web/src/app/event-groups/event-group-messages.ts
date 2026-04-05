/**
 * All user-facing strings for the Event Groups pages.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 */

export const EVENT_GROUP_MESSAGES = {
  loading: "Loading event groups...",
  title: "Event Groups",
  noGroups: "No event groups yet.",

  // Detail page
  detailLoading: "Loading...",
  detailNotFound: "Group not found.",
  eventsHeading: "Events",
  ticketTypesHeading: "Ticket Types",
  noTicketTypes: "No ticket types configured.",
  concessionLabel: "Concession:",
  capacityLabel: "Capacity:",
  coversAll: "Covers all events",
  partialCoverage: "Partial coverage",
} as const;
