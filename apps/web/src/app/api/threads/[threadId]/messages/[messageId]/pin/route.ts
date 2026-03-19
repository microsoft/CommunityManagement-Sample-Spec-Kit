import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { pinMessage } from "@/lib/threads/service";
import { pinMessageSchema } from "@/lib/validation/community-schemas";
import { unauthorized, forbidden, notFound, badRequest, fromZodError } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const permResult = await checkPermission(session.userId, {
    action: "moderateThread",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Requires moderateThread permission");

  const { messageId } = await params;
  const body = await req.json();
  const parsed = pinMessageSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const pinned = await pinMessage(messageId, session.userId, parsed.data.pinned);
    if (!pinned) return notFound("Message not found or already deleted");
    return NextResponse.json({ pinned: parsed.data.pinned });
  } catch (err) {
    return badRequest((err as Error).message);
  }
}
