// GET/PUT /api/notifications/preferences — Notification preference management
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getPreferences, updatePreference } from "@/lib/notifications/preferences";
import { NotificationType, NotificationChannel } from "@acroyoga/shared/types/notifications";
import { badRequest } from "@/lib/errors";
import { z } from "zod";

const updatePreferenceSchema = z.object({
  notificationType: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel),
  enabled: z.boolean(),
});

export const GET = requireAuth(async (_request: NextRequest, { userId }) => {
  const preferences = await getPreferences(userId);
  return NextResponse.json({ preferences });
});

export const PUT = requireAuth(async (request: NextRequest, { userId }) => {
  const body = await request.json();
  const parsed = updatePreferenceSchema.safeParse(body);

  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return badRequest("Validation failed", details);
  }

  const preference = await updatePreference(
    userId,
    parsed.data.notificationType,
    parsed.data.channel,
    parsed.data.enabled,
  );

  return NextResponse.json({ preference });
});
