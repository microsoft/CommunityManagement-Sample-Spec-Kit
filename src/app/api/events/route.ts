import { NextRequest, NextResponse } from "next/server";
import { listEvents, createEvent } from "@/lib/events/service";
import { listEventsSchema, createEventSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = listEventsSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await listEvents(parsed.data);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await createEvent(parsed.data, userId);
  return NextResponse.json(event, { status: 201 });
}
