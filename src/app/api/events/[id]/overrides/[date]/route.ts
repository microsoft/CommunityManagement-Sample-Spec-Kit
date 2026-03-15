import { NextRequest, NextResponse } from "next/server";
import {
  getOverride,
  updateOverride,
  deleteOverride,
} from "@/lib/recurrence/overrides";
import { updateOccurrenceOverrideSchema } from "@/lib/validation/recurring-schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const { id, date } = await params;
  const override = await getOverride(id, date);
  if (!override) {
    return NextResponse.json({ error: "Override not found" }, { status: 404 });
  }
  return NextResponse.json(override);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, date } = await params;
  const body = await request.json();
  const parsed = updateOccurrenceOverrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateOverride(id, date, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Override not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, date } = await params;
  const deleted = await deleteOverride(id, date);
  if (!deleted) {
    return NextResponse.json({ error: "Override not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
