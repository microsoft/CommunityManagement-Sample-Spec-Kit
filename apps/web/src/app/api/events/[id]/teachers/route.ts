import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listTeachersForEvent, assignTeacher, removeTeacher } from "@/lib/teachers/event-teachers";
import { assignTeacherSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const teachers = await listTeachersForEvent(id);
  return NextResponse.json(teachers);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = assignTeacherSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await assignTeacher(id, parsed.data.teacherProfileId, parsed.data.role);
    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  if (!body.teacherProfileId) {
    return NextResponse.json({ error: "teacherProfileId is required" }, { status: 400 });
  }

  const removed = await removeTeacher(id, body.teacherProfileId);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
