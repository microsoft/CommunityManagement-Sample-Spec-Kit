import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { muteUser, getMuteList } from "@/lib/safety/mutes";
import { createMuteSchema } from "@/lib/validation/community-schemas";
import { badRequest, fromZodError } from "@/lib/errors";

export const POST = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = createMuteSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const muted = await muteUser(userId, parsed.data.mutedId);
    return NextResponse.json({ muted });
  } catch (err) {
    return badRequest((err as Error).message);
  }
});

export const GET = requireAuth(async (_req, { userId }) => {
  const list = await getMuteList(userId);
  return NextResponse.json({ mutes: list });
});
