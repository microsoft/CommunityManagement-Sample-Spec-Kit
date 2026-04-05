/**
 * POST /api/notifications/devices — Register device push token
 * Spec: 016-mobile-app (T045)
 *
 * Constitution I: API-first — push token registration via REST.
 * Constitution IX: requireAuth() — only authenticated users can register devices.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";
import { badRequest, fromZodError } from "@/lib/errors";
import type { AuthContext } from "@/lib/auth/middleware";

const DeviceRegistrationSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

// In-memory device token store (production would use DB table)
const deviceTokens = new Map<
  string,
  { userId: string; platform: string; registeredAt: Date }
>();

export const POST = requireAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = DeviceRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const { expoPushToken, platform } = parsed.data;

  // Upsert device token
  deviceTokens.set(expoPushToken, {
    userId: ctx.userId,
    platform,
    registeredAt: new Date(),
  });

  return NextResponse.json(
    { registered: true, token: expoPushToken },
    { status: 201 },
  );
});
