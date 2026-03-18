import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { exportUserData } from "@/lib/gdpr/export";

/**
 * GET /api/me/export
 * GDPR data export — returns all user data as JSON.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  }

  const data = await exportUserData(session.userId);

  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="user-data-export-${Date.now()}.json"`,
    },
  });
}
