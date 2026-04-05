// GET /api/notifications — List notifications for current user (paginated)
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getNotificationsForUser, getUnreadCount } from "@/lib/notifications/service";

export const GET = requireAuth(async (request: NextRequest, { userId }) => {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  const [{ notifications, total }, unreadCount] = await Promise.all([
    getNotificationsForUser(userId, { page, pageSize }),
    getUnreadCount(userId),
  ]);

  return NextResponse.json({
    notifications,
    total,
    page,
    pageSize,
    unreadCount,
  });
});
