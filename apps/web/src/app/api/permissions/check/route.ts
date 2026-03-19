import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/permissions/service";
import { fromZodError, unauthorized } from "@/lib/errors";
import { rateLimit } from "@/lib/middleware/rate-limit";

const checkSchema = z.object({
  action: z.enum([
    "createEvent", "editEvent", "deleteEvent",
    "createVenue", "editVenue",
    "manageGrants", "approveRequests", "viewAdminPanel",
    "rsvp", "post", "follow",
  ]),
  targetScope: z.object({
    scopeType: z.enum(["global", "continent", "country", "city"]),
    scopeValue: z.string().nullable(),
  }),
  resourceOwnerId: z.string().uuid().optional(),
});

/**
 * @api {post} /api/permissions/check Check a permission
 * @apiDescription Checks if the authenticated user has permission to perform an action at a scope.
 * Always returns 200 — use the `allowed` field to determine access.
 * Rate-limited to 100 requests/minute per IP.
 * @apiBody {string} action - The permission action to check
 * @apiBody {object} targetScope - { scopeType, scopeValue }
 * @apiBody {string} [resourceOwnerId] - UUID of the resource owner (for edit-own-content check)
 * @apiSuccess {boolean} allowed - Whether the action is permitted
 * @apiSuccess {object|null} matchedGrant - The grant that authorized the action
 * @apiSuccess {string} effectiveRole - The user's effective role at the scope
 * @apiError 401 Not authenticated
 * @apiError 429 Rate limited
 */
export async function POST(req: NextRequest) {
  const rateLimited = rateLimit(req);
  if (rateLimited) return rateLimited;

  const session = await getServerSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await checkPermission(session.userId, parsed.data);

  // Always returns 200 — allowed: false is not a 403 on the check endpoint itself
  return NextResponse.json(result);
}
