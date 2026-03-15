import { NextRequest, NextResponse } from "next/server";
import {
  getOverridesForEvent,
  createOverride,
} from "@/lib/recurrence/overrides";
import { createOccurrenceOverrideSchema } from "@/lib/validation/recurring-schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const overrides = await getOverridesForEvent(id);
  return NextResponse.json(overrides);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = createOccurrenceOverrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const override = await createOverride(id, parsed.data, userId);
  return NextResponse.json(override, { status: 201 });
}
