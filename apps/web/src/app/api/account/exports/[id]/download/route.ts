import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getExportById, processExport } from "@/lib/gdpr/full-export";
import { unauthorized, notFound, badRequest } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const exportRow = await getExportById(id, session.userId);
  if (!exportRow) return notFound("Export not found");

  if (exportRow.status !== "completed") {
    return badRequest("Export is not yet completed");
  }

  // Generate the export data
  const data = await processExport(id);

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="data-export-${id}.json"`,
    },
  });
}
