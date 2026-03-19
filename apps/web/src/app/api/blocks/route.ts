import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { blockUser, getBlockList } from "@/lib/safety/blocks";
import { createBlockSchema } from "@/lib/validation/community-schemas";
import { badRequest, fromZodError } from "@/lib/errors";

export const POST = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = createBlockSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const result = await blockUser(userId, parsed.data.blockedId);
    return NextResponse.json(result);
  } catch (err) {
    return badRequest((err as Error).message);
  }
});

export const GET = requireAuth(async (_req, { userId }) => {
  const list = await getBlockList(userId);
  return NextResponse.json({ blocks: list });
});
