import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { unfollow } from "@/lib/follows/service";
import { unauthorized } from "@/lib/errors";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ followeeId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { followeeId } = await params;
  const unfollowed = await unfollow(session.userId, followeeId);
  return NextResponse.json({ unfollowed });
}
