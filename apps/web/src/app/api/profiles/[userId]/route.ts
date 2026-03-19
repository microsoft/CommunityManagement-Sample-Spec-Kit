import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getProfile } from "@/lib/profiles/service";
import { notFound } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const session = await getServerSession();
  const viewerId = session?.userId ?? null;

  const profile = await getProfile(userId, viewerId);
  if (!profile) return notFound("User not found");

  return NextResponse.json(profile);
}
