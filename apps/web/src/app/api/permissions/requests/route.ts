import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { submitRequest, listRequests } from "@/lib/requests/service";
import { submitRequestSchema } from "@/lib/requests/types";
import { getUserGrants } from "@/lib/permissions/cache";
import { doesScopeEncompass } from "@/lib/permissions/hierarchy";
import { badRequest, conflict, fromZodError, unauthorized } from "@/lib/errors";
import type { Scope } from "@acroyoga/shared/types/permissions";

// --- POST /api/permissions/requests --- (T044)

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = submitRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await submitRequest(session.userId, parsed.data.scopeValue, parsed.data.message);

  if (result.error === "invalid_city") return badRequest("Invalid city");
  if (result.error === "duplicate_pending") return conflict("Pending request already exists for this scope");

  return NextResponse.json({ request: result.request }, { status: 201 });
}

// --- GET /api/permissions/requests --- (T045)

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const params = req.nextUrl.searchParams;
  const userId = params.get("userId") ?? undefined;
  const status = params.get("status") ?? undefined;
  const scopeValue = params.get("scopeValue") ?? undefined;

  // If requesting own requests, allow
  if (userId === session.userId) {
    const requests = await listRequests({ status, scopeValue, userId });
    return NextResponse.json({ requests, total: requests.length });
  }

  // Otherwise, must be an admin — filter to their scope
  const callerGrants = await getUserGrants(session.userId);
  const allRequests = await listRequests({ status, scopeValue, userId });

  const visible = [];
  for (const request of allRequests) {
    const targetScope: Scope = { scopeType: "city", scopeValue: request.scopeValue };
    for (const grant of callerGrants) {
      if (["global_admin", "country_admin", "city_admin"].includes(grant.role)) {
        const encompass = await doesScopeEncompass(
          { scopeType: grant.scopeType, scopeValue: grant.scopeValue },
          targetScope,
        );
        if (encompass) {
          visible.push(request);
          break;
        }
      }
    }
  }

  return NextResponse.json({ requests: visible, total: visible.length });
}
