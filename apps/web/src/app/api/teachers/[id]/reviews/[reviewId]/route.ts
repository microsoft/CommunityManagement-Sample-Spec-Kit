import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hideReview, unhideReview } from "@/lib/teachers/reviews";
import { moderateReviewSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized, forbidden } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  // Admin-only endpoint
  const permResult = await checkPermission(userId, {
    action: "approveRequests",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Only admins can moderate reviews");

  const { reviewId } = await params;
  const body = await request.json();
  const parsed = moderateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = parsed.data.action === "hide"
    ? await hideReview(reviewId, userId, parsed.data.reason)
    : await unhideReview(reviewId);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
