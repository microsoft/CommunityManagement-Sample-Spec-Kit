import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { editMessage, deleteMessage } from "@/lib/threads/service";
import { editMessageSchema } from "@/lib/validation/community-schemas";
import { unauthorized, notFound, badRequest, fromZodError } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { messageId } = await params;
  const body = await req.json();
  const parsed = editMessageSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const message = await editMessage(messageId, session.userId, parsed.data.content);
    if (!message) return notFound("Message not found");
    return NextResponse.json(message);
  } catch (err) {
    return badRequest((err as Error).message);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { messageId } = await params;

  // Check if user has admin permissions
  const permResult = await checkPermission(session.userId, {
    action: "moderateThread",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  const isAdmin = permResult.allowed;

  try {
    const deleted = await deleteMessage(messageId, session.userId, isAdmin);
    if (!deleted) return notFound("Message not found or already deleted");
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return badRequest((err as Error).message);
  }
}
