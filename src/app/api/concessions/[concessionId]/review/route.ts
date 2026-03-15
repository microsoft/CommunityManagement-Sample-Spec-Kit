import { NextRequest, NextResponse } from "next/server";
import { reviewConcession } from "@/lib/concessions/service";
import { reviewConcessionSchema } from "@/lib/validation/recurring-schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ concessionId: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { concessionId } = await params;
  const body = await request.json();
  const parsed = reviewConcessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await reviewConcession(concessionId, userId, parsed.data);
    if (!result) {
      return NextResponse.json({ error: "Concession not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
