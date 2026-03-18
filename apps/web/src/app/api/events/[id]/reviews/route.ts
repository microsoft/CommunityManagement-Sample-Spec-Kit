import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { submitReview, listReviewsForEvent } from "@/lib/teachers/reviews";
import { submitReviewSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const teacherProfileId = searchParams.get("teacherProfileId") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const result = await listReviewsForEvent(id, teacherProfileId, page, limit);
  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { id } = await params;
  const body = await request.json();
  const parsed = submitReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const review = await submitReview(id, userId, parsed.data);
    return NextResponse.json(review, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("didn't attend") || message.includes("only review")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
