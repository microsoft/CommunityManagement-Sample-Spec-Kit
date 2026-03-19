/**
 * API Contract: Venues
 * Spec 001 — Venue CRUD for event locations
 *
 * Base path: /api/venues
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface Venue {
  id: string;
  name: string;
  address: string;
  cityId: string;
  cityName: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  createdBy: string;
  createdAt: string;            // ISO 8601
  updatedAt: string;
}

// ─── GET /api/venues — List venues ──────────────────────────────────

export interface ListVenuesQuery {
  cityId?: string;              // filter by city
  q?: string;                   // search by name
  page?: number;
  pageSize?: number;            // default 50
}

export interface ListVenuesResponse {
  venues: Venue[];
  total: number;
}

/** Auth: Public */

// ─── POST /api/venues — Create venue ────────────────────────────────

export interface CreateVenueRequest {
  name: string;
  address: string;
  cityId: string;
  latitude: number;
  longitude: number;
}

export interface CreateVenueResponse {
  venue: Venue;
}

/**
 * Auth: Event Creator or higher scoped to the venue's city
 *       (via withPermission('createVenue', { scopeType: 'city', scopeValue: citySlug }))
 * Errors: 400 (validation), 403 (no permission for city), 404 (city not found)
 */

// ─── GET /api/venues/:id — Venue detail ─────────────────────────────

export interface GetVenueResponse {
  venue: Venue;
}

/** Auth: Public */

// ─── PATCH /api/venues/:id — Edit venue ─────────────────────────────

export interface UpdateVenueRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateVenueResponse {
  venue: Venue;
}

/**
 * Auth: Venue owner or scoped admin
 *       (via withPermission('editVenue', { scopeType: 'city', scopeValue: citySlug }))
 *       Owner can always edit their own venue (Principle XI).
 * Errors: 400, 403, 404
 */
