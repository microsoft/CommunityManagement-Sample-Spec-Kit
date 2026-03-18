import { db } from "@/lib/db/client";
import type {
  TicketType,
  TicketTypeAvailability,
  CreateTicketTypeRequest,
  UpdateTicketTypeRequest,
} from "@acroyoga/shared/types/recurring";

export async function createTicketType(
  groupId: string,
  data: CreateTicketTypeRequest,
): Promise<TicketType> {
  const result = await db().query<TicketType>(
    `INSERT INTO ticket_types (group_id, name, cost, concession_cost, capacity, covers_all_events)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, group_id, name, cost, concession_cost, capacity, covers_all_events, created_at, updated_at`,
    [
      groupId,
      data.name,
      data.cost,
      data.concessionCost ?? null,
      data.capacity,
      data.coversAllEvents ?? true,
    ],
  );

  const ticket = result.rows[0];

  // If partial coverage, link specific events
  if (!data.coversAllEvents && data.eventIds?.length) {
    const placeholders = data.eventIds
      .map((_, i) => `($1, $${i + 2})`)
      .join(", ");
    await db().query(
      `INSERT INTO ticket_type_events (ticket_type_id, event_id) VALUES ${placeholders}`,
      [ticket.id, ...data.eventIds],
    );
  }

  return ticket;
}

export async function getTicketType(
  ticketTypeId: string,
): Promise<TicketType | null> {
  const result = await db().query<TicketType>(
    `SELECT id, group_id, name, cost, concession_cost, capacity, covers_all_events, created_at, updated_at
     FROM ticket_types WHERE id = $1`,
    [ticketTypeId],
  );
  return result.rows[0] ?? null;
}

export async function listTicketTypes(
  groupId: string,
): Promise<TicketType[]> {
  const result = await db().query<TicketType>(
    `SELECT id, group_id, name, cost, concession_cost, capacity, covers_all_events, created_at, updated_at
     FROM ticket_types WHERE group_id = $1 ORDER BY created_at`,
    [groupId],
  );
  return result.rows;
}

export async function updateTicketType(
  ticketTypeId: string,
  data: UpdateTicketTypeRequest,
): Promise<TicketType | null> {
  const fields: string[] = [];
  const values: unknown[] = [ticketTypeId];
  let idx = 2;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.cost !== undefined) { fields.push(`cost = $${idx++}`); values.push(data.cost); }
  if (data.concessionCost !== undefined) { fields.push(`concession_cost = $${idx++}`); values.push(data.concessionCost); }
  if (data.capacity !== undefined) { fields.push(`capacity = $${idx++}`); values.push(data.capacity); }
  if (data.coversAllEvents !== undefined) { fields.push(`covers_all_events = $${idx++}`); values.push(data.coversAllEvents); }

  if (fields.length > 0) {
    fields.push("updated_at = now()");
    await db().query(
      `UPDATE ticket_types SET ${fields.join(", ")} WHERE id = $1`,
      values,
    );
  }

  // Replace event links if provided
  if (data.eventIds) {
    await db().query(`DELETE FROM ticket_type_events WHERE ticket_type_id = $1`, [ticketTypeId]);
    if (data.eventIds.length > 0) {
      const placeholders = data.eventIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(", ");
      await db().query(
        `INSERT INTO ticket_type_events (ticket_type_id, event_id) VALUES ${placeholders}`,
        [ticketTypeId, ...data.eventIds],
      );
    }
  }

  return getTicketType(ticketTypeId);
}

export async function deleteTicketType(ticketTypeId: string): Promise<boolean> {
  const check = await db().query(
    `SELECT 1 FROM ticket_types WHERE id = $1`,
    [ticketTypeId],
  );
  if (check.rows.length === 0) return false;

  await db().query(`DELETE FROM ticket_types WHERE id = $1`, [ticketTypeId]);
  return true;
}

/**
 * Get availability for a ticket type: capacity minus confirmed bookings.
 */
export async function getTicketTypeAvailability(
  ticketTypeId: string,
): Promise<TicketTypeAvailability | null> {
  const ticket = await getTicketType(ticketTypeId);
  if (!ticket) return null;

  const booked = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM bookings
     WHERE ticket_type_id = $1 AND payment_status NOT IN ('cancelled', 'refunded')`,
    [ticketTypeId],
  );

  const sold = parseInt(booked.rows[0].count, 10);

  return {
    ...ticket,
    sold,
    available: ticket.capacity - sold,
  };
}

/**
 * Resolve which events a ticket covers.
 */
export async function getTicketCoveredEvents(
  ticketTypeId: string,
): Promise<string[]> {
  const ticket = await getTicketType(ticketTypeId);
  if (!ticket) return [];

  if (ticket.covers_all_events) {
    const result = await db().query<{ event_id: string }>(
      `SELECT event_id FROM event_group_members WHERE group_id = $1 ORDER BY sort_order`,
      [ticket.group_id],
    );
    return result.rows.map((r) => r.event_id);
  }

  const result = await db().query<{ event_id: string }>(
    `SELECT event_id FROM ticket_type_events WHERE ticket_type_id = $1`,
    [ticketTypeId],
  );
  return result.rows.map((r) => r.event_id);
}
