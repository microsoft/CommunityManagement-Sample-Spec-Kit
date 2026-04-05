// POST /api/notifications/read-all — Mark all notifications as read (batch)
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { markAllAsRead } from "@/lib/notifications/service";

export const POST = requireAuth(async (_request, { userId }) => {
  const count = await markAllAsRead(userId);
  return NextResponse.json({ updated: count });
});
