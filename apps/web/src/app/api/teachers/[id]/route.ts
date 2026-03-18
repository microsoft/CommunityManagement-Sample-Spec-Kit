import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getTeacherProfile, updateTeacherProfile, deleteTeacherProfile } from "@/lib/teachers/profiles";
import { updateProfileSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized, forbidden, notFound } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await getTeacherProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { id } = await params;
  const profile = await getTeacherProfile(id);
  if (!profile) return notFound("Teacher profile not found");

  // Ownership check: only the profile owner or an admin can modify
  if (profile.user_id !== userId) {
    const permResult = await checkPermission(userId, {
      action: "approveRequests",
      targetScope: { scopeType: "global", scopeValue: null },
    });
    if (!permResult.allowed) return forbidden("Only the profile owner or an admin can update this profile");
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await updateTeacherProfile(id, parsed.data);
  if (!result) return notFound("Teacher profile not found");
  return NextResponse.json(result);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { id } = await params;
  const profile = await getTeacherProfile(id);
  if (!profile) return notFound("Teacher profile not found");

  // Ownership check: only the profile owner or an admin can delete
  if (profile.user_id !== userId) {
    const permResult = await checkPermission(userId, {
      action: "approveRequests",
      targetScope: { scopeType: "global", scopeValue: null },
    });
    if (!permResult.allowed) return forbidden("Only the profile owner or an admin can delete this profile");
  }

  const deleted = await deleteTeacherProfile(id);
  if (!deleted) return notFound("Teacher profile not found");
  return NextResponse.json({ success: true });
}
