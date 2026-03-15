import { NextRequest, NextResponse } from "next/server";
import {
  getTicketType,
  updateTicketType,
  deleteTicketType,
  getTicketTypeAvailability,
} from "@/lib/event-groups/ticket-types";
import { updateTicketTypeSchema } from "@/lib/validation/recurring-schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string; ticketId: string }> },
) {
  const { ticketId } = await params;
  const ticket = await getTicketType(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
  }

  const availability = await getTicketTypeAvailability(ticketId);
  return NextResponse.json({ ...ticket, availability });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; ticketId: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;
  const body = await request.json();
  const parsed = updateTicketTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateTicketType(ticketId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; ticketId: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;
  const deleted = await deleteTicketType(ticketId);
  if (!deleted) {
    return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
