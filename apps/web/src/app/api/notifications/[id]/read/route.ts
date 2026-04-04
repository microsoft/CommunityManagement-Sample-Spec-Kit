// POST /api/notifications/:id/read — Mark a notification as read
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { markAsRead } from "@/lib/notifications/service";
import { notFound, unauthorized } from "@/lib/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const updated = await markAsRead(id, session.userId);

  if (!updated) {
    return notFound("Notification not found");
  }

  return NextResponse.json({ read: true });
}
