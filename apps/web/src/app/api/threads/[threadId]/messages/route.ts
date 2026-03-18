import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listMessages, createMessage } from "@/lib/threads/service";
import { createMessageSchema, listMessagesSchema } from "@/lib/validation/community-schemas";
import { unauthorized, badRequest, fromZodError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const session = await getServerSession();
  const viewerId = session?.userId ?? null;

  const url = new URL(req.url);
  const parsed = listMessagesSchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await listMessages(threadId, viewerId, parsed.data.cursor, parsed.data.limit);
  return NextResponse.json(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { threadId } = await params;
  const body = await req.json();
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const message = await createMessage(threadId, session.userId, parsed.data.content);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return badRequest((err as Error).message);
  }
}
