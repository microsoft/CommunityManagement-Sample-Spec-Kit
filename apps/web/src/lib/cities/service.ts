import { db } from "@/lib/db/client";
import { escapeIlike } from "@/lib/db/utils";
import type { City, NearestCityResponse } from "@acroyoga/shared/types/cities";

interface CityRow {
  id: string;
  name: string;
  slug: string;
  country_name: string;
  country_code: string;
  latitude: string;
  longitude: string;
  timezone: string;
  active_event_count?: string;
}

function rowToCity(row: CityRow): City {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    countryName: row.country_name,
    countryCode: row.country_code,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    timezone: row.timezone,
    activeEventCount: row.active_event_count ? parseInt(row.active_event_count, 10) : undefined,
  };
}

export async function listCities(filters?: {
  countryCode?: string;
  q?: string;
  activeOnly?: boolean;
}): Promise<City[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.countryCode) {
    conditions.push(`co.code = $${paramIdx++}`);
    params.push(filters.countryCode);
  }
  if (filters?.q) {
    conditions.push(`c.name ILIKE $${paramIdx++}`);
    params.push(`%${escapeIlike(filters.q)}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db().query<CityRow>(
    `SELECT c.id, c.name, c.slug, co.name as country_name, co.code as country_code,
            c.latitude, c.longitude, c.timezone,
            COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'published' AND e.start_datetime > now()) as active_event_count
     FROM cities c
     JOIN countries co ON c.country_id = co.id
     LEFT JOIN venues v ON v.city_id = c.id
     LEFT JOIN events e ON e.venue_id = v.id
     ${where}
     GROUP BY c.id, c.name, c.slug, co.name, co.code, c.latitude, c.longitude, c.timezone
     ${filters?.activeOnly ? "HAVING COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'published' AND e.start_datetime > now()) > 0" : ""}
     ORDER BY c.name`,
    params,
  );

  return result.rows.map(rowToCity);
}

export async function getCityById(id: string): Promise<City | null> {
  const result = await db().query<CityRow>(
    `SELECT c.id, c.name, c.slug, co.name as country_name, co.code as country_code,
            c.latitude, c.longitude, c.timezone
     FROM cities c
     JOIN countries co ON c.country_id = co.id
     WHERE c.id = $1`,
    [id],
  );
  return result.rows.length > 0 ? rowToCity(result.rows[0]) : null;
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  const result = await db().query<CityRow>(
    `SELECT c.id, c.name, c.slug, co.name as country_name, co.code as country_code,
            c.latitude, c.longitude, c.timezone
     FROM cities c
     JOIN countries co ON c.country_id = co.id
     WHERE c.slug = $1`,
    [slug],
  );
  return result.rows.length > 0 ? rowToCity(result.rows[0]) : null;
}

/**
 * Haversine-based nearest city lookup (R-1).
 * Uses pure SQL math — PGlite compatible, no PostGIS required.
 */
export async function findNearestCity(lat: number, lon: number): Promise<NearestCityResponse> {
  const THRESHOLD_KM = 100;

  const result = await db().query<CityRow & { distance_km: string }>(
    `SELECT c.id, c.name, c.slug, co.name as country_name, co.code as country_code,
            c.latitude, c.longitude, c.timezone,
            (6371 * acos(
              cos(radians($1)) * cos(radians(c.latitude)) *
              cos(radians(c.longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(c.latitude))
            )) as distance_km
     FROM cities c
     JOIN countries co ON c.country_id = co.id
     ORDER BY distance_km ASC
     LIMIT 1`,
    [lat, lon],
  );

  if (result.rows.length === 0) {
    return { city: null, distanceKm: null, matched: false };
  }

  const row = result.rows[0];
  const distanceKm = parseFloat(row.distance_km);

  if (distanceKm > THRESHOLD_KM) {
    return { city: null, distanceKm, matched: false };
  }

  return { city: rowToCity(row), distanceKm, matched: true };
}
