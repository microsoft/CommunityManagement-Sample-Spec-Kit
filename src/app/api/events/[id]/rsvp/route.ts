import { NextRequest, NextResponse } from "next/server";
import { createRsvp, getEventRsvps } from "@/lib/rsvp/service";
import { createRsvpSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rsvps = await getEventRsvps(id);
  return NextResponse.json({ rsvps });
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
  const parsed = createRsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createRsvp(eventId, userId, parsed.data);

  if (result.error) {
    if (result.waitlisted) {
      return NextResponse.json({ error: result.error, waitlisted: true }, { status: 409 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.rsvp, { status: 201 });
}
