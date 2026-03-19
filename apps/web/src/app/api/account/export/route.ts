import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { requestExport, processExport } from "@/lib/gdpr/full-export";
import { badRequest } from "@/lib/errors";

export const POST = requireAuth(async (_req, { userId }) => {
  try {
    const result = await requestExport(userId);

    // Immediately process export (sync for simplicity; production would use a job queue)
    const exportData = await processExport(result.exportId);

    return NextResponse.json({
      exportId: result.exportId,
      status: "completed",
      data: exportData,
    }, { status: 201 });
  } catch (err) {
    return badRequest((err as Error).message);
  }
});
