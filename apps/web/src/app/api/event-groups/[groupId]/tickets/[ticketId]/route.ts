import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getTicketType,
  updateTicketType,
  deleteTicketType,
  getTicketTypeAvailability,
} from "@/lib/event-groups/ticket-types";
import { updateTicketTypeSchema } from "@/lib/validation/recurring-schemas";
import { unauthorized } from "@/lib/errors";

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
  const session = await getServerSession();
  if (!session) return unauthorized();

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
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { ticketId } = await params;
  const deleted = await deleteTicketType(ticketId);
  if (!deleted) {
    return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
