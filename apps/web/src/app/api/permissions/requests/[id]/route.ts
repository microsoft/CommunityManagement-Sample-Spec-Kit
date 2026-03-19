import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/permissions/service";
import { reviewRequest } from "@/lib/requests/service";
import { reviewRequestSchema } from "@/lib/requests/types";
import { db } from "@/lib/db/client";
import { conflict, forbidden, fromZodError, notFound, unauthorized } from "@/lib/errors";

// --- PATCH /api/permissions/requests/:id --- (T046)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await req.json();
  const parsed = reviewRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  // Look up the request to get its scope
  const requestResult = await db().query<{ scope_value: string }>(
    "SELECT scope_value FROM permission_requests WHERE id = $1",
    [id],
  );
  if (requestResult.rows.length === 0) return notFound("Request not found");

  const scopeValue = requestResult.rows[0].scope_value;

  // Check caller has approveRequests permission for the request's scope
  const permCheck = await checkPermission(session.userId, {
    action: "approveRequests",
    targetScope: { scopeType: "city", scopeValue },
  });
  if (!permCheck.allowed) return forbidden();

  const result = await reviewRequest(
    id,
    parsed.data.decision,
    session.userId,
    parsed.data.reason,
  );

  if (result.error === "not_found") return notFound("Request not found");
  if (result.error === "already_reviewed") return conflict("Request already reviewed");

  const response: Record<string, unknown> = { request: result.request };
  if (result.grantId) {
    response.grant = {
      id: result.grantId,
      role: "event_creator",
      scopeType: "city",
      scopeValue,
    };
  }

  return NextResponse.json(response);
}
