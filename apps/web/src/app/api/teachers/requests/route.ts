import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listPendingRequests } from "@/lib/teachers/applications";
import { unauthorized, forbidden } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  // Admin-only endpoint
  const permResult = await checkPermission(session.userId, {
    action: "approveRequests",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Only admins can view pending teacher requests");

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

  const result = await listPendingRequests(page, limit);
  return NextResponse.json(result);
}
