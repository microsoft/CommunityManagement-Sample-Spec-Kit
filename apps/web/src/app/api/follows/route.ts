import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { follow, getFollowing } from "@/lib/follows/service";
import { createFollowSchema } from "@/lib/validation/community-schemas";
import { badRequest, fromZodError } from "@/lib/errors";

export const POST = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = createFollowSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const result = await follow(userId, parsed.data.followeeId);
    return NextResponse.json(result);
  } catch (err) {
    return badRequest((err as Error).message);
  }
});

export const GET = requireAuth(async (req, { userId }) => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

  const result = await getFollowing(userId, userId, page, pageSize);
  return NextResponse.json(result);
});
