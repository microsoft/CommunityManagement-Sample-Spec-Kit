import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getServerSession } from "@/lib/auth/session";
import { submitReport, getReportQueue } from "@/lib/safety/reports";
import { createReportSchema } from "@/lib/validation/community-schemas";
import { badRequest, fromZodError, forbidden } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export const POST = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const result = await submitReport(
      userId,
      parsed.data.reportedUserId,
      parsed.data.reason,
      parsed.data.details,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return badRequest((err as Error).message);
  }
});

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new NextResponse(null, { status: 401 });

  // Check moderateReports permission
  const permResult = await checkPermission(session.userId, {
    action: "moderateReports",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Requires moderateReports permission");

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "pending" | "reviewed" | "actioned" | "dismissed" | null;
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

  const result = await getReportQueue(status ?? undefined, page, pageSize);
  return NextResponse.json(result);
}
