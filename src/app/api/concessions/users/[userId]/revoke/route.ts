import { NextRequest, NextResponse } from "next/server";
import { revokeConcession } from "@/lib/concessions/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const adminId = request.headers.get("x-user-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
