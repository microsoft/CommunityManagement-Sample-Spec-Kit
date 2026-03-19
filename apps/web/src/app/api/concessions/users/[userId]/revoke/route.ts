import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { revokeConcession } from "@/lib/concessions/service";
import { unauthorized } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const adminId = session.userId;

  const { userId } = await params;
  const result = await revokeConcession(userId, adminId);
  if (!result) {
    return NextResponse.json(
      { error: "No approved concession found for user" },
      { status: 404 },
    );
  }
  return NextResponse.json(result);
}
