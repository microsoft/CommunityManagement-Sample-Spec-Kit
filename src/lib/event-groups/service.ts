import { db } from "@/lib/db/client";
import type {
  EventGroup,
  EventGroupMember,
  CreateEventGroupRequest,
  UpdateEventGroupRequest,
} from "@/types/recurring";

export async function createEventGroup(
  data: CreateEventGroupRequest,
  createdBy: string,
): Promise<EventGroup> {
  const result = await db().query<EventGroup>(
    `INSERT INTO event_groups (name, type, start_date, end_date, currency, poster_image_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, type, start_date, end_date, currency, poster_image_url, created_by, created_at, updated_at`,
    [
      data.name,
      data.type,
      data.startDate,
      data.endDate,
      data.currency,
      data.posterImageUrl ?? null,
      createdBy,
    ],
  );

  const group = result.rows[0];

  // Add member events
  if (data.eventIds?.length) {
    const placeholders = data.eventIds
      .map((_, i) => `($1, $${i + 2}, ${i})`)
      .join(", ");
    const values: unknown[] = [group.id, ...data.eventIds];
    await db().query(
      `INSERT INTO event_group_members (group_id, event_id, sort_order) VALUES ${placeholders}`,
      values,
    );
  }

  return group;
}

export async function getEventGroup(
  groupId: string,
): Promise<EventGroup | null> {
  const result = await db().query<EventGroup>(
    `SELECT id, name, type, start_date, end_date, currency, poster_image_url, created_by, created_at, updated_at
     FROM event_groups WHERE id = $1`,
    [groupId],
  );
  return result.rows[0] ?? null;
}

export async function listEventGroups(
  filters?: { type?: string; createdBy?: string },
): Promise<EventGroup[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters?.type) {
    conditions.push(`type = $${idx++}`);
    values.push(filters.type);
  }
  if (filters?.createdBy) {
    conditions.push(`created_by = $${idx++}`);
    values.push(filters.createdBy);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await db().query<EventGroup>(
    `SELECT id, name, type, start_date, end_date, currency, poster_image_url, created_by, created_at, updated_at
     FROM event_groups ${where} ORDER BY start_date DESC`,
    values,
  );
  return result.rows;
}

export async function updateEventGroup(
  groupId: string,
  data: UpdateEventGroupRequest,
): Promise<EventGroup | null> {
  const fields: string[] = [];
  const values: unknown[] = [groupId];
  let idx = 2;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.type !== undefined) { fields.push(`type = $${idx++}`); values.push(data.type); }
  if (data.startDate !== undefined) { fields.push(`start_date = $${idx++}`); values.push(data.startDate); }
  if (data.endDate !== undefined) { fields.push(`end_date = $${idx++}`); values.push(data.endDate); }
  if (data.currency !== undefined) { fields.push(`currency = $${idx++}`); values.push(data.currency); }
  if (data.posterImageUrl !== undefined) { fields.push(`poster_image_url = $${idx++}`); values.push(data.posterImageUrl); }

  if (fields.length === 0 && !data.eventIds) return getEventGroup(groupId);

  if (fields.length > 0) {
    fields.push("updated_at = now()");
    await db().query(
      `UPDATE event_groups SET ${fields.join(", ")} WHERE id = $1`,
      values,
    );
  }

  // Replace member events if provided
  if (data.eventIds) {
    await db().query(`DELETE FROM event_group_members WHERE group_id = $1`, [groupId]);
    if (data.eventIds.length > 0) {
      const placeholders = data.eventIds
        .map((_, i) => `($1, $${i + 2}, ${i})`)
        .join(", ");
      await db().query(
        `INSERT INTO event_group_members (group_id, event_id, sort_order) VALUES ${placeholders}`,
        [groupId, ...data.eventIds],
      );
    }
  }

  return getEventGroup(groupId);
}

export async function deleteEventGroup(groupId: string): Promise<boolean> {
  const check = await db().query(
    `SELECT 1 FROM event_groups WHERE id = $1`,
    [groupId],
  );
  if (check.rows.length === 0) return false;

  await db().query(`DELETE FROM event_groups WHERE id = $1`, [groupId]);
  return true;
}

export async function getGroupMembers(
  groupId: string,
): Promise<EventGroupMember[]> {
  const result = await db().query<EventGroupMember>(
    `SELECT id, group_id, event_id, sort_order
     FROM event_group_members WHERE group_id = $1 ORDER BY sort_order`,
    [groupId],
  );
  return result.rows;
}
