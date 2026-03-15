import { NextRequest, NextResponse } from "next/server";
import { getShareMeta } from "@/lib/events/share";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meta = await getShareMeta(id);
  if (!meta) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(meta);
}
