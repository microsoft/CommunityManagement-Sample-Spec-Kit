import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { unmuteUser } from "@/lib/safety/mutes";
import { unauthorized } from "@/lib/errors";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mutedId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { mutedId } = await params;
  const unmuted = await unmuteUser(session.userId, mutedId);
  return NextResponse.json({ unmuted });
}
