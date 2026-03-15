import { db } from "@/lib/db/client";
import type { Venue, CreateVenueRequest, UpdateVenueRequest } from "@/types/venues";

interface VenueRow {
  id: string;
  name: string;
  address: string;
  city_id: string;
  city_name: string;
  city_slug: string;
  latitude: string;
  longitude: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function rowToVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    cityId: row.city_id,
    cityName: row.city_name,
    citySlug: row.city_slug,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const VENUE_SELECT = `
  SELECT v.id, v.name, v.address, v.city_id, c.name as city_name, c.slug as city_slug,
         v.latitude, v.longitude, v.created_by, v.created_at, v.updated_at
  FROM venues v
  JOIN cities c ON v.city_id = c.id`;

export async function listVenues(filters?: {
  cityId?: string;
  createdBy?: string;
  q?: string;
}): Promise<Venue[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.cityId) {
    conditions.push(`v.city_id = $${idx++}`);
    params.push(filters.cityId);
  }
  if (filters?.createdBy) {
    conditions.push(`v.created_by = $${idx++}`);
    params.push(filters.createdBy);
  }
  if (filters?.q) {
    conditions.push(`(v.name ILIKE $${idx} OR v.address ILIKE $${idx})`);
    params.push(`%${filters.q}%`);
    idx++;
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const result = await db().query<VenueRow>(`${VENUE_SELECT}${where} ORDER BY v.name`, params);
  return result.rows.map(rowToVenue);
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const result = await db().query<VenueRow>(`${VENUE_SELECT} WHERE v.id = $1`, [id]);
  return result.rows.length > 0 ? rowToVenue(result.rows[0]) : null;
}

export async function createVenue(data: CreateVenueRequest, createdBy: string): Promise<Venue> {
  const result = await db().query<{ id: string }>(
    `INSERT INTO venues (name, address, city_id, latitude, longitude, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.name, data.address, data.cityId, data.latitude, data.longitude, createdBy],
  );
  const venue = await getVenueById(result.rows[0].id);
  return venue!;
}

export async function updateVenue(id: string, data: UpdateVenueRequest): Promise<Venue | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
  if (data.address !== undefined) { sets.push(`address = $${idx++}`); params.push(data.address); }
  if (data.latitude !== undefined) { sets.push(`latitude = $${idx++}`); params.push(data.latitude); }
  if (data.longitude !== undefined) { sets.push(`longitude = $${idx++}`); params.push(data.longitude); }

  if (sets.length === 0) return getVenueById(id);

  sets.push(`updated_at = now()`);
  params.push(id);

  await db().query(
    `UPDATE venues SET ${sets.join(", ")} WHERE id = $${idx}`,
    params,
  );
  return getVenueById(id);
}

export async function deleteVenue(id: string): Promise<boolean> {
  const existing = await getVenueById(id);
  if (!existing) return false;
  await db().query("DELETE FROM venues WHERE id = $1", [id]);
  return true;
}
