import { NextRequest, NextResponse } from "next/server";
import { joinWaitlist, getEventWaitlist, leaveWaitlist } from "@/lib/waitlist/service";
import { joinWaitlistSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entries = await getEventWaitlist(id);
  return NextResponse.json({ waitlist: entries });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const body = await request.json();
  const parsed = joinWaitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await joinWaitlist(eventId, userId, parsed.data.role, parsed.data.occurrenceDate);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.entry, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const removed = await leaveWaitlist(eventId, userId);

  if (!removed) {
    return NextResponse.json({ error: "Not on waitlist" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
