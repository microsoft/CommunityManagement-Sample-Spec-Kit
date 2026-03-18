import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getExports } from "@/lib/gdpr/full-export";

export const GET = requireAuth(async (_req, { userId }) => {
  const exports = await getExports(userId);
  return NextResponse.json({ exports });
});
