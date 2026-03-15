import { NextRequest, NextResponse } from "next/server";
import { applySeriesEdit } from "@/lib/recurrence/service";
import { seriesEditSchema } from "@/lib/validation/recurring-schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = seriesEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await applySeriesEdit(id, parsed.data);
  return NextResponse.json({ success: true });
}
