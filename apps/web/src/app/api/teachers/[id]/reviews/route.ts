import { NextRequest, NextResponse } from "next/server";
import { listReviewsForTeacher } from "@/lib/teachers/reviews";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const result = await listReviewsForTeacher(id, page, limit);
  return NextResponse.json(result);
}
