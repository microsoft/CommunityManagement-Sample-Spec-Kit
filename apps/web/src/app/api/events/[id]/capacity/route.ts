import { NextRequest, NextResponse } from "next/server";
import { checkCapacity } from "@/lib/events/capacity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const occurrenceDate = searchParams.get("occurrenceDate") ?? undefined;

  try {
    const capacity = await checkCapacity(id, occurrenceDate);
    return NextResponse.json(capacity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
