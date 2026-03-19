import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getOverride,
  updateOverride,
  deleteOverride,
} from "@/lib/recurrence/overrides";
import { updateOccurrenceOverrideSchema } from "@/lib/validation/recurring-schemas";
import { unauthorized } from "@/lib/errors";

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
  const session = await getServerSession();
  if (!session) return unauthorized();

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
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id, date } = await params;
  const deleted = await deleteOverride(id, date);
  if (!deleted) {
    return NextResponse.json({ error: "Override not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
