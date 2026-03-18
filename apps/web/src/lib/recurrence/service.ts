import { expandOccurrences } from "./expander";
import { getOverridesForEvent } from "./overrides";
import { db } from "@/lib/db/client";
import type { Occurrence, SeriesEditRequest } from "@acroyoga/shared/types/recurring";

/**
 * List occurrences for a recurring event, merging overrides.
 * Cancelled occurrences are excluded, modified ones get their field overrides applied.
 */
export async function listOccurrences(
  eventId: string,
  from?: Date,
  to?: Date,
): Promise<Occurrence[]> {
  // Load event base data
  const eventResult = await db().query<{
    id: string;
    title: string;
    start_datetime: string;
    end_datetime: string;
    recurrence_rule: string | null;
    capacity: number;
  }>(
    `SELECT id, title, start_datetime, end_datetime, recurrence_rule, capacity
     FROM events WHERE id = $1`,
    [eventId],
  );
  const event = eventResult.rows[0];
  if (!event) return [];
  if (!event.recurrence_rule) return [];

  // Expand from RRULE
  const expanded = await expandOccurrences(
    eventId,
    event.recurrence_rule,
    event.start_datetime,
    event.end_datetime,
    from,
    to,
  );

  // Load overrides
  const overrides = await getOverridesForEvent(eventId);
  const overrideMap = new Map(
    overrides.map((o) => [
      typeof o.occurrence_date === "string"
        ? o.occurrence_date
        : new Date(o.occurrence_date as unknown as string).toISOString().slice(0, 10),
      o,
    ]),
  );

  // Load RSVP counts per occurrence date
  const rsvpResult = await db().query<{
    occurrence_date: string;
    count: string;
  }>(
    `SELECT occurrence_date, COUNT(*)::text as count
     FROM rsvps WHERE event_id = $1 AND status = 'confirmed'
     GROUP BY occurrence_date`,
    [eventId],
  );
  const rsvpCounts = new Map(
    rsvpResult.rows.map((r) => [
      r.occurrence_date?.toString().slice(0, 10),
      parseInt(r.count, 10),
    ]),
  );

  const occurrences: Occurrence[] = [];

  for (const occ of expanded) {
    const override = overrideMap.get(occ.date);

    // Skip cancelled occurrences
    if (override?.override_type === "cancelled") continue;

    const modified = override?.modified_fields as Record<string, unknown> | null;
    const rsvpCount = rsvpCounts.get(occ.date) ?? 0;

    occurrences.push({
      eventId,
      date: occ.date,
      startDatetime: (modified?.start_datetime as string) ?? occ.startDatetime,
      endDatetime: (modified?.end_datetime as string) ?? occ.endDatetime,
      title: (modified?.title as string) ?? event.title,
      capacity: (modified?.capacity as number) ?? event.capacity,
      isCancelled: false,
      isModified: !!override,
      rsvpCount,
    });
  }

  return occurrences;
}

/**
 * Apply a series-wide edit (this-and-future or all-future scope).
 * For 'this': creates a single override.
 * For 'thisAndFuture': updates the base event's recurrence endDate to split, then creates new event.
 * For 'all': updates the base event fields directly.
 */
export async function applySeriesEdit(
  eventId: string,
  data: SeriesEditRequest,
  userId?: string,
): Promise<void> {
  if (data.scope === "all") {
    // Update base event fields
    const fields: string[] = [];
    const values: unknown[] = [eventId];
    let idx = 2;

    for (const [key, value] of Object.entries(data.changes)) {
      fields.push(`${toSnakeCase(key)} = $${idx++}`);
      values.push(value);
    }

    if (fields.length > 0) {
      fields.push("updated_at = now()");
      await db().query(
        `UPDATE events SET ${fields.join(", ")} WHERE id = $1`,
        values,
      );
    }
  } else if (data.scope === "this") {
    // Create/update a single occurrence override
    const existing = await db().query(
      `SELECT id FROM occurrence_overrides WHERE event_id = $1 AND occurrence_date = $2`,
      [eventId, data.occurrenceDate],
    );

    if (existing.rows.length > 0) {
      await db().query(
        `UPDATE occurrence_overrides
         SET override_type = 'modified', modified_fields = $3, updated_at = now()
         WHERE event_id = $1 AND occurrence_date = $2`,
        [eventId, data.occurrenceDate, JSON.stringify(data.changes)],
      );
    } else {
      await db().query(
        `INSERT INTO occurrence_overrides (event_id, occurrence_date, override_type, modified_fields, created_by)
         VALUES ($1, $2, 'modified', $3, $4)`,
        [eventId, data.occurrenceDate, JSON.stringify(data.changes), userId],
      );
    }
  } else if (data.scope === "thisAndFuture") {
    // Cancel all occurrences from the split date onwards
    // and create override entries for them
    const { occurrenceDate } = data;
    if (!occurrenceDate) return;
    const eventResult = await db().query<{ recurrence_rule: string }>(
      `SELECT recurrence_rule FROM events WHERE id = $1`,
      [eventId],
    );
    const rule = eventResult.rows[0]?.recurrence_rule;
    if (!rule) return;

    // Update the recurrence rule endDate to day before split
    const splitDate = new Date(occurrenceDate);
    splitDate.setDate(splitDate.getDate() - 1);
    const updatedRule = JSON.parse(rule);
    updatedRule.endDate = splitDate.toISOString().slice(0, 10);

    await db().query(
      `UPDATE events SET recurrence_rule = $2, updated_at = now() WHERE id = $1`,
      [eventId, JSON.stringify(updatedRule)],
    );
  }
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
