import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getRequest, approveRequest, rejectRequest } from "@/lib/teachers/applications";
import { reviewRequestSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized, forbidden } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getRequest(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  // Admin-only endpoint
  const permResult = await checkPermission(userId, {
    action: "approveRequests",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Only admins can review teacher requests");

  const { id } = await params;
  const body = await request.json();
  const parsed = reviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = parsed.data.decision === "approved"
      ? await approveRequest(id, userId)
      : await rejectRequest(id, userId, parsed.data.reason);

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
