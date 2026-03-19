import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { lockThread } from "@/lib/threads/service";
import { lockThreadSchema } from "@/lib/validation/community-schemas";
import { unauthorized, forbidden, notFound, fromZodError } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const permResult = await checkPermission(session.userId, {
    action: "moderateThread",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Requires moderateThread permission");

  const { threadId } = await params;
  const body = await req.json();
  const parsed = lockThreadSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const thread = await lockThread(threadId, parsed.data.locked, session.userId);
  if (!thread) return notFound("Thread not found");

  return NextResponse.json(thread);
}
