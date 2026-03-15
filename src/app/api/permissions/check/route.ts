import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/permissions/service";
import { fromZodError, unauthorized } from "@/lib/errors";

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

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await checkPermission(session.userId, parsed.data);

  // Always returns 200 — allowed: false is not a 403 on the check endpoint itself
  return NextResponse.json(result);
}
