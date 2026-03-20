import type { ListEventsQuery, EventSummary, EventSummaryWithCoords } from "@acroyoga/shared/types/events";
import type { ExplorerFilterState, MapMarkerData } from "@acroyoga/shared/types/explorer";

export function mapFiltersToQuery(filters: ExplorerFilterState): ListEventsQuery {
  return {
    category:
      filters.categories.length > 0 && filters.categories.length < 7
        ? filters.categories[0]
        : undefined,
    city: filters.location ?? undefined,
    dateFrom: filters.dateFrom ?? undefined,
    dateTo: filters.dateTo ?? undefined,
    skillLevel: filters.skillLevel ?? undefined,
    status: filters.status.length > 0 ? filters.status.join(",") : undefined,
    q: filters.q ?? undefined,
    page: filters.page,
    pageSize: 200,
  };
}

export function extractMapMarkers(events: EventSummary[]): MapMarkerData[] {
  return events
    .filter((e) => {
      const lat = (e as EventSummaryWithCoords).venueLatitude;
      const lng = (e as EventSummaryWithCoords).venueLongitude;
      return lat != null && lng != null && lat !== 0 && lng !== 0;
    })
    .map((e) => {
      const withCoords = e as EventSummaryWithCoords;
      return {
        eventId: e.id,
        latitude: withCoords.venueLatitude!,
        longitude: withCoords.venueLongitude!,
        category: e.category,
        title: e.title,
        date: e.startDatetime,
        venueName: e.venueName,
        cityName: e.cityName,
      };
    });
}
