import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { reviewReport } from "@/lib/safety/reports";
import { reviewReportSchema } from "@/lib/validation/community-schemas";
import { unauthorized, forbidden, notFound, fromZodError } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const permResult = await checkPermission(session.userId, {
    action: "moderateReports",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Requires moderateReports permission");

  const { id } = await params;
  const body = await req.json();
  const parsed = reviewReportSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await reviewReport(id, session.userId, parsed.data.status);
  if (!result) return notFound("Report not found");

  return NextResponse.json(result);
}
