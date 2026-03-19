import { db } from "@/lib/db/client";
import type {
  OccurrenceOverride,
  CreateOccurrenceOverrideRequest,
  UpdateOccurrenceOverrideRequest,
} from "@acroyoga/shared/types/recurring";

export async function getOverridesForEvent(
  eventId: string,
): Promise<OccurrenceOverride[]> {
  const result = await db().query<OccurrenceOverride>(
    `SELECT id, event_id, occurrence_date, override_type, modified_fields,
            created_by, created_at, updated_at
     FROM occurrence_overrides
     WHERE event_id = $1
     ORDER BY occurrence_date`,
    [eventId],
  );
  return result.rows;
}

export async function getOverride(
  eventId: string,
  occurrenceDate: string,
): Promise<OccurrenceOverride | null> {
  const result = await db().query<OccurrenceOverride>(
    `SELECT id, event_id, occurrence_date, override_type, modified_fields,
            created_by, created_at, updated_at
     FROM occurrence_overrides
     WHERE event_id = $1 AND occurrence_date = $2`,
    [eventId, occurrenceDate],
  );
  return result.rows[0] ?? null;
}

export async function createOverride(
  eventId: string,
  data: CreateOccurrenceOverrideRequest & { occurrenceDate: string },
  createdBy: string,
): Promise<OccurrenceOverride> {
  const result = await db().query<OccurrenceOverride>(
    `INSERT INTO occurrence_overrides (event_id, occurrence_date, override_type, modified_fields, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, event_id, occurrence_date, override_type, modified_fields, created_by, created_at, updated_at`,
    [
      eventId,
      data.occurrenceDate,
      data.overrideType,
      data.modifiedFields ? JSON.stringify(data.modifiedFields) : '{}',
      createdBy,
    ],
  );
  return result.rows[0];
}

export async function updateOverride(
  eventId: string,
  occurrenceDate: string,
  data: UpdateOccurrenceOverrideRequest,
): Promise<OccurrenceOverride | null> {
  const fields: string[] = [];
  const values: unknown[] = [eventId, occurrenceDate];
  let idx = 3;

  if (data.overrideType !== undefined) {
    fields.push(`override_type = $${idx++}`);
    values.push(data.overrideType);
  }
  if (data.modifiedFields !== undefined) {
    fields.push(`modified_fields = $${idx++}`);
    values.push(JSON.stringify(data.modifiedFields));
  }

  if (fields.length === 0) return getOverride(eventId, occurrenceDate);

  fields.push("updated_at = now()");

  const result = await db().query<OccurrenceOverride>(
    `UPDATE occurrence_overrides
     SET ${fields.join(", ")}
     WHERE event_id = $1 AND occurrence_date = $2
     RETURNING id, event_id, occurrence_date, override_type, modified_fields, created_by, created_at, updated_at`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deleteOverride(
  eventId: string,
  occurrenceDate: string,
): Promise<boolean> {
  const check = await db().query(
    `SELECT 1 FROM occurrence_overrides WHERE event_id = $1 AND occurrence_date = $2`,
    [eventId, occurrenceDate],
  );
  if (check.rows.length === 0) return false;

  await db().query(
    `DELETE FROM occurrence_overrides WHERE event_id = $1 AND occurrence_date = $2`,
    [eventId, occurrenceDate],
  );
  return true;
}
