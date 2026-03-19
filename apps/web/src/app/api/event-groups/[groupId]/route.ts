import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getEventGroup,
  updateEventGroup,
  deleteEventGroup,
  getGroupMembers,
} from "@/lib/event-groups/service";
import { updateEventGroupSchema } from "@/lib/validation/recurring-schemas";
import { unauthorized } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  const group = await getEventGroup(groupId);
  if (!group) {
    return NextResponse.json({ error: "Event group not found" }, { status: 404 });
  }

  const members = await getGroupMembers(groupId);
  return NextResponse.json({ ...group, members });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { groupId } = await params;
  const existing = await getEventGroup(groupId);
  if (!existing) {
    return NextResponse.json({ error: "Event group not found" }, { status: 404 });
  }
  if (existing.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateEventGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateEventGroup(groupId, parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { groupId } = await params;
  const existing = await getEventGroup(groupId);
  if (!existing) {
    return NextResponse.json({ error: "Event group not found" }, { status: 404 });
  }
  if (existing.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteEventGroup(groupId);
  return NextResponse.json({ success: true });
}
