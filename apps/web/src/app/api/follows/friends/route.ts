import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getFriends } from "@/lib/follows/service";

export const GET = requireAuth(async (req, { userId }) => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

  const result = await getFriends(userId, page, pageSize);
  return NextResponse.json(result);
});
