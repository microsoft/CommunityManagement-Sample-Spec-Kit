import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ApiClient } from "../api/client";
import type {
  EventCategory,
  EventDetail,
  ListEventsResponse,
} from "../types/events";

// ---------------------------------------------------------------------------
// Filter params (mobile-friendly subset of ListEventsQuery)
// ---------------------------------------------------------------------------

export interface EventsFilterParams {
  category?: EventCategory;
  /** When true the query restricts results to events starting from *now*. */
  upcoming?: boolean;
  /** Free-text search forwarded as the `q` query-string parameter. */
  search?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Query-key factory
// ---------------------------------------------------------------------------

export const eventsKeys = {
  all: ["events"] as const,
  lists: () => [...eventsKeys.all, "list"] as const,
  list: (params?: EventsFilterParams) =>
    [...eventsKeys.lists(), params ?? {}] as const,
  details: () => [...eventsKeys.all, "detail"] as const,
  detail: (id: string) => [...eventsKeys.details(), id] as const,
} as const;

// ---------------------------------------------------------------------------
// Path builder (exported for testing)
// ---------------------------------------------------------------------------

export function buildEventsPath(params?: EventsFilterParams): string {
  if (!params) return "/api/events";

  const entries: [string, string][] = [];

  if (params.category) entries.push(["category", params.category]);
  if (params.upcoming) entries.push(["dateFrom", new Date().toISOString()]);
  if (params.search) entries.push(["q", params.search]);
  if (params.limit !== undefined)
    entries.push(["pageSize", String(params.limit)]);
  if (params.offset !== undefined)
    entries.push(["page", String(params.offset)]);

  if (entries.length === 0) return "/api/events";

  const searchParams = new URLSearchParams(entries);
  return `/api/events?${searchParams.toString()}`;
}

// ---------------------------------------------------------------------------
// Query-option factories (usable with useQuery / useSuspenseQuery / prefetch)
// ---------------------------------------------------------------------------

export function eventsListOptions(
  client: ApiClient,
  params?: EventsFilterParams,
) {
  return queryOptions({
    queryKey: eventsKeys.list(params),
    queryFn: () => client.get<ListEventsResponse>(buildEventsPath(params)),
  });
}

export function eventDetailOptions(client: ApiClient, id: string) {
  return queryOptions({
    queryKey: eventsKeys.detail(id),
    queryFn: () =>
      client.get<EventDetail>(`/api/events/${encodeURIComponent(id)}`),
    enabled: id.length > 0,
  });
}

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

export function useEvents(client: ApiClient, params?: EventsFilterParams) {
  return useQuery(eventsListOptions(client, params));
}

export function useEventDetail(client: ApiClient, id: string) {
  return useQuery(eventDetailOptions(client, id));
}
