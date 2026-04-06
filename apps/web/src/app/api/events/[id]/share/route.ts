import { NextRequest, NextResponse } from "next/server";
import { getShareMeta } from "@/lib/events/share";
import { notFound } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meta = await getShareMeta(id);
  if (!meta) {
    return notFound("Event not found");
  }
  return NextResponse.json(meta);
}
