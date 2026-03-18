import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { reviewConcession } from "@/lib/concessions/service";
import { reviewConcessionSchema } from "@/lib/validation/recurring-schemas";
import { unauthorized } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ concessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

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
