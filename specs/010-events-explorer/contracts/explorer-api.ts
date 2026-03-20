/**
 * API Usage Contract: Events Explorer
 * Spec 010 — How the Explorer consumes existing API endpoints
 *
 * No new API routes are introduced. This contract documents the
 * adapter layer between ExplorerFilterState and existing API calls.
 */

import type { ListEventsQuery, ListEventsResponse, EventSummary } from '../../../packages/shared/src/types/events';
import type { ExplorerFilterState, CityWithContinent, MapMarkerData } from './explorer-types';

// ─── API Call Signatures ────────────────────────────────────────────

/**
 * Fetch events for the Explorer.
 * Maps ExplorerFilterState → ListEventsQuery → GET /api/events
 */
export interface FetchExplorerEventsParams {
  filters: ExplorerFilterState;
}

/**
 * Fetch cities with continent info for the location tree.
 * GET /api/cities?activeOnly=true
 *
 * Requires the API to include continentCode/continentName in response
 * (backward-compatible field addition — see research.md R-10).
 */
export interface FetchExplorerCitiesParams {
  activeOnly?: boolean;  // default: true
}

// ─── Adapter Functions ──────────────────────────────────────────────

/**
 * Convert ExplorerFilterState to the existing ListEventsQuery format
 * used by GET /api/events.
 *
 * Mapping:
 *   categories[]     → category (comma-separated, requires API extension to accept multiple)
 *   location         → city (city slug)
 *   dateFrom         → dateFrom
 *   dateTo           → dateTo
 *   skillLevel       → skillLevel
 *   status[]         → status (comma-separated)
 *   q                → q
 *   page             → page
 *   (view is client-only — not sent to API)
 */
export function mapFiltersToQuery(filters: ExplorerFilterState): ListEventsQuery {
  return {
    // If categories are filtered (not all), send as comma-separated
    // If all 7 categories are active, omit (server returns all)
    category: filters.categories.length > 0 && filters.categories.length < 7
      ? filters.categories[0]  // NOTE: API currently accepts single category
      : undefined,             // TODO: Extend API to accept category[] if needed
    city: filters.location ?? undefined,
    dateFrom: filters.dateFrom ?? undefined,
    dateTo: filters.dateTo ?? undefined,
    skillLevel: filters.skillLevel ?? undefined,
    status: filters.status.length > 0 ? filters.status.join(',') : undefined,
    q: filters.q ?? undefined,
    page: filters.page,
    pageSize: 200,  // Explorer fetches larger pages for calendar population
  };
}

/**
 * Extract MapMarkerData from EventSummary[].
 * Events without valid coordinates are excluded.
 *
 * NOTE: EventSummary does not currently include venue coordinates.
 * The Explorer will need either:
 * (a) An extended EventSummary with lat/lng (preferred — add to list response), or
 * (b) A separate venue lookup (violates N+1 prohibition).
 *
 * Decision: Extend the list events response to include venue coordinates.
 * This is a backward-compatible field addition to EventSummary:
 *   venueLatitude?: number | null
 *   venueLongitude?: number | null
 */
export function extractMapMarkers(events: EventSummary[]): MapMarkerData[] {
  return events
    .filter((e) => {
      const lat = (e as EventSummaryWithCoords).venueLatitude;
      const lng = (e as EventSummaryWithCoords).venueLongitude;
      return lat != null && lng != null && lat !== 0 && lng !== 0;
    })
    .map((e) => ({
      eventId: e.id,
      latitude: (e as EventSummaryWithCoords).venueLatitude!,
      longitude: (e as EventSummaryWithCoords).venueLongitude!,
      category: e.category,
      title: e.title,
      date: e.startDatetime,
      venueName: e.venueName,
      cityName: e.cityName,
    }));
}

/**
 * Temporary extension of EventSummary with venue coordinates.
 * This should be moved to @acroyoga/shared/types/events once the API is extended.
 */
export interface EventSummaryWithCoords extends EventSummary {
  venueLatitude?: number | null;
  venueLongitude?: number | null;
}

// ─── API Response Adapters ──────────────────────────────────────────

/**
 * Response from GET /api/cities when extended with continent info.
 * The response shape is the same as ListCitiesResponse but each city
 * includes continentCode and continentName.
 */
export interface ExplorerCitiesResponse {
  cities: CityWithContinent[];
}

// ─── Required API Extensions (Backward-Compatible) ──────────────────
//
// The following changes to existing API endpoints are needed:
//
// 1. GET /api/cities — add continentCode, continentName to each City
//    Source: JOIN countries ON cities.country_id = countries.id
//    Breaking: No (additive field)
//
// 2. GET /api/events — add venueLatitude, venueLongitude to EventSummary
//    Source: JOIN venues ON events.venue_id = venues.id (already joined for venueName)
//    Breaking: No (additive field)
//
// 3. GET /api/events — consider accepting category as comma-separated list
//    for multi-category filtering. Current API accepts single category.
//    Workaround: Client-side filter after fetch (acceptable for <500 events).
//    Breaking: No (extends existing parameter semantics)
