import { NextRequest, NextResponse } from "next/server";
import { listOccurrences } from "@/lib/recurrence/service";
import { listOccurrencesSchema } from "@/lib/validation/recurring-schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const parsed = listOccurrencesSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const from = parsed.data.from ? new Date(parsed.data.from) : undefined;
  const to = parsed.data.to ? new Date(parsed.data.to) : undefined;

  const occurrences = await listOccurrences(id, from, to);
  return NextResponse.json(occurrences);
}
