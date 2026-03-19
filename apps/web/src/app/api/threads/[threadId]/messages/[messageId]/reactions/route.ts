import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { toggleReaction } from "@/lib/threads/service";
import { toggleReactionSchema } from "@/lib/validation/community-schemas";
import { unauthorized, fromZodError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { messageId } = await params;
  const body = await req.json();
  const parsed = toggleReactionSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await toggleReaction(messageId, session.userId, parsed.data.emoji);
  return NextResponse.json({ ...result, emoji: parsed.data.emoji });
}
