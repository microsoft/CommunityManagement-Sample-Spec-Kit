import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { unblockUser } from "@/lib/safety/blocks";
import { unauthorized } from "@/lib/errors";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ blockedId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { blockedId } = await params;
  const unblocked = await unblockUser(session.userId, blockedId);
  return NextResponse.json({ unblocked });
}
