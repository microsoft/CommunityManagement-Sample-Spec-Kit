import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { checkPermission, grantPermission, listGrantsForScope, revokePermission } from "@/lib/permissions/service";
import { getUserGrants } from "@/lib/permissions/cache";
import { badRequest, conflict, forbidden, fromZodError, notFound, unauthorized } from "@/lib/errors";

/**
 * @api {post} /api/permissions/grants Create a permission grant
 * @apiDescription Grants a role to a user at a specific scope. Requires manageGrants capability.
 * @apiBody {string} userId - UUID of the user to grant the role to
 * @apiBody {string} role - One of: global_admin, country_admin, city_admin, event_creator
 * @apiBody {string} scopeType - One of: global, continent, country, city
 * @apiBody {string|null} scopeValue - The scope value (e.g. "bristol") or null for global
 * @apiSuccess {object} grant - The created PermissionGrant
 * @apiError 400 Invalid request body
 * @apiError 401 Not authenticated
 * @apiError 403 Caller lacks manageGrants capability for target scope
 * @apiError 409 Duplicate active grant already exists
 */

const createGrantSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["global_admin", "country_admin", "city_admin", "event_creator"]),
  scopeType: z.enum(["global", "continent", "country", "city"]),
  scopeValue: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = createGrantSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const { userId, role, scopeType, scopeValue } = parsed.data;

  // Check caller has manageGrants permission for the target scope
  const permCheck = await checkPermission(session.userId, {
    action: "manageGrants",
    targetScope: { scopeType, scopeValue },
  });
  if (!permCheck.allowed) return forbidden();

  try {
    const grant = await grantPermission(userId, role, scopeType, scopeValue, session.userId);
    return NextResponse.json({ grant }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("idx_grants_no_duplicate")) {
      return conflict("Duplicate active grant already exists");
    }
    throw err;
  }
}

/**
 * @api {get} /api/permissions/grants List permission grants
 * @apiDescription Returns grants visible to the caller's admin scope.
 * @apiQuery {string} [userId] - Filter by user UUID
 * @apiQuery {string} [scopeType] - Filter by scope type
 * @apiQuery {string} [scopeValue] - Filter by scope value
 * @apiQuery {boolean} [includeRevoked=false] - Include revoked grants
 * @apiSuccess {array} grants - Array of PermissionGrant objects
 * @apiSuccess {number} total - Total count of returned grants
 * @apiError 401 Not authenticated
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const params = req.nextUrl.searchParams;
  const filters = {
    userId: params.get("userId") ?? undefined,
    scopeType: params.get("scopeType") as "global" | "continent" | "country" | "city" | undefined,
    scopeValue: params.get("scopeValue") ?? undefined,
    includeRevoked: params.get("includeRevoked") === "true",
  };

  // Scope listing to caller's grants
  const callerGrants = await getUserGrants(session.userId);
  const grants = await listGrantsForScope(callerGrants, filters);

  return NextResponse.json({ grants, total: grants.length });
}

/**
 * @api {delete} /api/permissions/grants Revoke a permission grant
 * @apiDescription Soft-deletes a grant by setting revoked_at. Protects last global admin.
 * @apiBody {string} grantId - UUID of the grant to revoke
 * @apiSuccess {object} grant - The revoked PermissionGrant (with revoked_at set)
 * @apiError 400 Invalid request body
 * @apiError 401 Not authenticated
 * @apiError 403 Caller lacks admin role
 * @apiError 404 Grant not found
 * @apiError 409 Grant already revoked, or last global admin protection
 */

const revokeGrantSchema = z.object({
  grantId: z.string().uuid(),
});

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = revokeGrantSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  // Check caller has manageGrants (scope resolved from grant itself)
  const callerGrants = await getUserGrants(session.userId);
  const hasAdmin = callerGrants.some((g) =>
    ["global_admin", "country_admin", "city_admin"].includes(g.role),
  );
  if (!hasAdmin) return forbidden();

  const result = await revokePermission(parsed.data.grantId, session.userId);

  if (result.error === "not_found") return notFound("Grant not found");
  if (result.error === "already_revoked") return conflict("Grant already revoked");
  if (result.error === "last_global_admin") return conflict("Cannot revoke the last global admin");

  return NextResponse.json({ grant: result.grant });
}
