import { NextRequest, NextResponse } from "next/server";
import { createTicketType, listTicketTypes } from "@/lib/event-groups/ticket-types";
import { createTicketTypeSchema } from "@/lib/validation/recurring-schemas";
import { getEventGroup } from "@/lib/event-groups/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  const tickets = await listTicketTypes(groupId);
  return NextResponse.json(tickets);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;
  const group = await getEventGroup(groupId);
  if (!group) {
    return NextResponse.json({ error: "Event group not found" }, { status: 404 });
  }
  if (group.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createTicketTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ticket = await createTicketType(groupId, parsed.data);
  return NextResponse.json(ticket, { status: 201 });
}
