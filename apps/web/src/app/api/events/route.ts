import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { listEvents, createEvent } from "@/lib/events/service";
import { listEventsSchema, createEventSchema } from "@/lib/validation/schemas";
import { fromZodError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = listEventsSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await listEvents(parsed.data);
  return NextResponse.json(result);
}

export const POST = requireAuth(async (request, { userId }) => {
  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const event = await createEvent(parsed.data, userId);
  return NextResponse.json(event, { status: 201 });
});
