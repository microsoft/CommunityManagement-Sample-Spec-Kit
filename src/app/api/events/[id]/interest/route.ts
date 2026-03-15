import { NextRequest, NextResponse } from "next/server";
import { toggleInterest } from "@/lib/interests/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const result = await toggleInterest(eventId, userId);
  return NextResponse.json(result);
}
