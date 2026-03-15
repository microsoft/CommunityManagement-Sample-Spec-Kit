import { db } from "@/lib/db/client";
import type {
  EventSummary,
  EventDetail,
  CreateEventRequest,
  UpdateEventRequest,
  ListEventsQuery,
  ListEventsResponse,
  RoleBreakdown,
  AttendeePublic,
  VenueDetail,
  MapLinks,
} from "@/types/events";

/* ---------- Row types ---------- */

interface EventSummaryRow {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  city_name: string;
  city_slug: string;
  category: string;
  skill_level: string;
  cost: string;
  currency: string;
  capacity: string;
  confirmed_count: string;
  interested_count: string;
  poster_image_url: string | null;
  is_external: boolean;
}

interface EventDetailRow extends EventSummaryRow {
  description: string | null;
  prerequisites: string | null;
  concession_cost: string | null;
  refund_window_hours: string;
  waitlist_cutoff_hours: string;
  external_url: string | null;
  recurrence_rule: string | null;
  status: string;
  venue_id: string;
  venue_address: string;
  venue_city_id: string;
  venue_lat: string;
  venue_lon: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/* ---------- Helpers ---------- */

function buildMapLinks(lat: number, lon: number): MapLinks {
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    apple: `https://maps.apple.com/?ll=${lat},${lon}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
    what3words: `https://what3words.com/${lat},${lon}`,
  };
}

function buildRoleHint(breakdown: RoleBreakdown): string {
  if (breakdown.base === 0 && breakdown.flyer === 0 && breakdown.hybrid === 0) return "";
  const ratio = breakdown.flyer > 0 ? breakdown.base / breakdown.flyer : Infinity;
  if (ratio > 2) return "Flyers needed!";
  if (ratio < 0.5) return "Bases needed!";
  return "";
}

function rowToSummary(row: EventSummaryRow): EventSummary {
  return {
    id: row.id,
    title: row.title,
    startDatetime: row.start_datetime,
    endDatetime: row.end_datetime,
    venueName: row.venue_name,
    cityName: row.city_name,
    citySlug: row.city_slug,
    category: row.category as EventSummary["category"],
    skillLevel: row.skill_level as EventSummary["skillLevel"],
    cost: parseFloat(row.cost),
    currency: row.currency,
    capacity: parseInt(row.capacity, 10),
    confirmedCount: parseInt(row.confirmed_count, 10),
    interestedCount: parseInt(row.interested_count, 10),
    posterImageUrl: row.poster_image_url,
    isExternal: row.is_external,
  };
}

/* ---------- List events ---------- */

export async function listEvents(query: ListEventsQuery): Promise<ListEventsResponse> {
  const conditions: string[] = ["e.status = 'published'"];
  const params: unknown[] = [];
  let idx = 1;

  if (query.city) {
    conditions.push(`c.slug = $${idx++}`);
    params.push(query.city);
  }
  if (query.category) {
    conditions.push(`e.category = $${idx++}`);
    params.push(query.category);
  }
  if (query.skillLevel) {
    conditions.push(`(e.skill_level = $${idx} OR e.skill_level = 'all_levels')`);
    params.push(query.skillLevel);
    idx++;
  }
  if (query.dateFrom) {
    conditions.push(`e.start_datetime >= $${idx++}`);
    params.push(query.dateFrom);
  }
  if (query.dateTo) {
    conditions.push(`e.start_datetime <= $${idx++}`);
    params.push(query.dateTo);
  }
  if (query.status) {
    const pills = query.status.split(",");
    const statusConds: string[] = [];
    for (const pill of pills) {
      switch (pill.trim()) {
        case "full":
          statusConds.push(`(SELECT COUNT(*) FROM rsvps r2 WHERE r2.event_id = e.id AND r2.status IN ('confirmed','pending_payment')) >= e.capacity`);
          break;
        case "past":
          statusConds.push(`e.start_datetime < now()`);
          break;
        case "new":
          statusConds.push(`e.created_at > now() - interval '7 days'`);
          break;
      }
    }
    if (statusConds.length > 0) {
      conditions.push(`(${statusConds.join(" OR ")})`);
    }
  }
  if (query.q) {
    conditions.push(`(e.title ILIKE $${idx} OR e.description ILIKE $${idx} OR v.name ILIKE $${idx})`);
    params.push(`%${query.q}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // Count
  const countParams = [...params];
  const countResult = await db().query<{ total: string }>(
    `SELECT COUNT(DISTINCT e.id) as total
     FROM events e
     JOIN venues v ON e.venue_id = v.id
     JOIN cities c ON v.city_id = c.id
     ${where}`,
    countParams,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Fetch page
  params.push(pageSize, offset);
  const result = await db().query<EventSummaryRow>(
    `SELECT e.id, e.title, e.start_datetime, e.end_datetime,
            v.name as venue_name, c.name as city_name, c.slug as city_slug,
            e.category, e.skill_level, e.cost, e.currency, e.capacity,
            e.poster_image_url, e.is_external,
            COALESCE(rsvp_counts.cnt, 0) as confirmed_count,
            COALESCE(interest_counts.cnt, 0) as interested_count
     FROM events e
     JOIN venues v ON e.venue_id = v.id
     JOIN cities c ON v.city_id = c.id
     LEFT JOIN (
       SELECT event_id, COUNT(*) as cnt FROM rsvps WHERE status IN ('confirmed','pending_payment') GROUP BY event_id
     ) rsvp_counts ON rsvp_counts.event_id = e.id
     LEFT JOIN (
       SELECT event_id, COUNT(*) as cnt FROM event_interests GROUP BY event_id
     ) interest_counts ON interest_counts.event_id = e.id
     ${where}
     ORDER BY e.start_datetime ASC
     LIMIT $${idx++} OFFSET $${idx}`,
    params,
  );

  return {
    events: result.rows.map(rowToSummary),
    total,
    page,
    pageSize,
  };
}

/* ---------- Get event detail ---------- */

export async function getEventById(eventId: string): Promise<EventDetail | null> {
  const result = await db().query<EventDetailRow>(
    `SELECT e.*,
            v.name as venue_name, v.address as venue_address, v.city_id as venue_city_id,
            v.latitude as venue_lat, v.longitude as venue_lon,
            c.name as city_name, c.slug as city_slug,
            COALESCE(rsvp_counts.cnt, 0) as confirmed_count,
            COALESCE(interest_counts.cnt, 0) as interested_count
     FROM events e
     JOIN venues v ON e.venue_id = v.id
     JOIN cities c ON v.city_id = c.id
     LEFT JOIN (
       SELECT event_id, COUNT(*) as cnt FROM rsvps WHERE status IN ('confirmed','pending_payment') GROUP BY event_id
     ) rsvp_counts ON rsvp_counts.event_id = e.id
     LEFT JOIN (
       SELECT event_id, COUNT(*) as cnt FROM event_interests GROUP BY event_id
     ) interest_counts ON interest_counts.event_id = e.id
     WHERE e.id = $1`,
    [eventId],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  // Role breakdown
  const roleResult = await db().query<{ role: string; cnt: string }>(
    `SELECT role, COUNT(*) as cnt FROM rsvps WHERE event_id = $1 AND status = 'confirmed' GROUP BY role`,
    [eventId],
  );
  const breakdown: RoleBreakdown = { base: 0, flyer: 0, hybrid: 0, hint: "" };
  for (const r of roleResult.rows) {
    breakdown[r.role as keyof Omit<RoleBreakdown, "hint">] = parseInt(r.cnt, 10);
  }
  breakdown.hint = buildRoleHint(breakdown);

  // Attendees (only opt-in)
  const attendeeResult = await db().query<{ user_id: string; name: string; role: string }>(
    `SELECT r.user_id, u.name, r.role
     FROM rsvps r
     JOIN users u ON r.user_id = u.id
     WHERE r.event_id = $1 AND r.status = 'confirmed' AND r.name_visible = true
     ORDER BY r.created_at ASC`,
    [eventId],
  );
  const attendees: AttendeePublic[] = attendeeResult.rows.map((a) => ({
    userId: a.user_id,
    displayName: a.name,
    role: a.role as AttendeePublic["role"],
  }));

  const venueLat = parseFloat(row.venue_lat);
  const venueLon = parseFloat(row.venue_lon);
  const venue: VenueDetail = {
    id: row.venue_id,
    name: row.venue_name,
    address: row.venue_address,
    cityId: row.venue_city_id,
    cityName: row.city_name,
    latitude: venueLat,
    longitude: venueLon,
    mapLinks: buildMapLinks(venueLat, venueLon),
  };

  return {
    ...rowToSummary(row),
    description: row.description,
    prerequisites: row.prerequisites,
    concessionCost: row.concession_cost ? parseFloat(row.concession_cost) : null,
    refundWindowHours: parseInt(row.refund_window_hours, 10),
    waitlistCutoffHours: parseInt(row.waitlist_cutoff_hours, 10),
    externalUrl: row.external_url,
    recurrenceRule: row.recurrence_rule,
    status: row.status as EventDetail["status"],
    venue,
    roleBreakdown: breakdown,
    attendees,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ---------- Create event ---------- */

export async function createEvent(data: CreateEventRequest, createdBy: string): Promise<EventDetail> {
  const result = await db().query<{ id: string }>(
    `INSERT INTO events (
       title, description, start_datetime, end_datetime, venue_id,
       category, skill_level, prerequisites, cost, currency, concession_cost,
       capacity, refund_window_hours, waitlist_cutoff_hours,
       is_external, external_url, poster_image_url, recurrence_rule, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id`,
    [
      data.title,
      data.description ?? null,
      data.startDatetime,
      data.endDatetime,
      data.venueId,
      data.category,
      data.skillLevel,
      data.prerequisites ?? null,
      data.cost ?? 0,
      data.currency ?? "GBP",
      data.concessionCost ?? null,
      data.capacity,
      data.refundWindowHours ?? 24,
      data.waitlistCutoffHours ?? 2,
      data.isExternal ?? false,
      data.externalUrl ?? null,
      data.posterImageUrl ?? null,
      data.recurrenceRule ?? null,
      createdBy,
    ],
  );

  const event = await getEventById(result.rows[0].id);
  return event!;
}

/* ---------- Update event ---------- */

export async function updateEvent(id: string, data: UpdateEventRequest): Promise<EventDetail | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const fields: [keyof UpdateEventRequest, string][] = [
    ["title", "title"],
    ["description", "description"],
    ["startDatetime", "start_datetime"],
    ["endDatetime", "end_datetime"],
    ["venueId", "venue_id"],
    ["category", "category"],
    ["skillLevel", "skill_level"],
    ["prerequisites", "prerequisites"],
    ["cost", "cost"],
    ["concessionCost", "concession_cost"],
    ["capacity", "capacity"],
    ["refundWindowHours", "refund_window_hours"],
    ["waitlistCutoffHours", "waitlist_cutoff_hours"],
    ["posterImageUrl", "poster_image_url"],
    ["recurrenceRule", "recurrence_rule"],
  ];

  for (const [key, col] of fields) {
    if (data[key] !== undefined) {
      sets.push(`${col} = $${idx++}`);
      params.push(data[key]);
    }
  }

  if (sets.length === 0) return getEventById(id);

  sets.push("updated_at = now()");
  params.push(id);

  await db().query(
    `UPDATE events SET ${sets.join(", ")} WHERE id = $${idx}`,
    params,
  );
  return getEventById(id);
}

/* ---------- Cancel event ---------- */

export async function cancelEvent(id: string): Promise<EventDetail | null> {
  await db().query(
    `UPDATE events SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = $1`,
    [id],
  );
  return getEventById(id);
}

/* ---------- Delete event ---------- */

export async function deleteEvent(id: string): Promise<boolean> {
  const result = await db().query("DELETE FROM events WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
