import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { applySeriesEdit } from "@/lib/recurrence/service";
import { seriesEditSchema } from "@/lib/validation/recurring-schemas";
import { unauthorized } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = seriesEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await applySeriesEdit(id, parsed.data);
  return NextResponse.json({ success: true });
}
