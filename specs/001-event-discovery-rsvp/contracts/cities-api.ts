/**
 * API Contract: Cities
 * Spec 001 — Platform city registry and geolocation snap
 *
 * Base path: /api/cities
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface City {
  id: string;
  name: string;
  slug: string;
  countryName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** Number of upcoming published events in this city */
  activeEventCount: number;
}

// ─── GET /api/cities — List platform cities ─────────────────────────

export interface ListCitiesQuery {
  /** If true, only return cities with at least one upcoming published event */
  activeOnly?: boolean;         // default true
  countryCode?: string;         // filter by country
  q?: string;                   // search by city name
}

export interface ListCitiesResponse {
  cities: City[];
  total: number;
}

/** Auth: Public */

// ─── GET /api/cities/nearest — Geolocation snap ─────────────────────

export interface NearestCityQuery {
  lat: number;                  // user latitude
  lon: number;                  // user longitude
}

export interface NearestCityResponse {
  /** null if no city with active events is within 100km */
  city: City | null;
  /** Distance in km from user coordinates to the nearest city (null if no match) */
  distanceKm: number | null;
  /** True if a city was found within 100km threshold */
  matched: boolean;
}

/**
 * Auth: Public
 * Implementation: Haversine distance against cities table, filtered to cities with active events.
 * If nearest city > 100km → returns { city: null, matched: false }
 * Client should show city picker prompt when matched = false.
 * Errors: 400 (invalid coordinates)
 */
