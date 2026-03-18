import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { toggleInterest } from "@/lib/interests/service";
import { unauthorized } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { id: eventId } = await params;
  const result = await toggleInterest(eventId, userId);
  return NextResponse.json(result);
}
