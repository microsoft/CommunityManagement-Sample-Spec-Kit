import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listExpiringCertifications } from "@/lib/teachers/certifications";
import { unauthorized, forbidden } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();

  // Admin-only endpoint
  const permResult = await checkPermission(session.userId, {
    action: "viewAdminPanel",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Only admins can view expiring certifications");

  const days = parseInt(process.env.CERT_ALERT_DAYS_BEFORE_EXPIRY ?? "30", 10);
  const certs = await listExpiringCertifications(days);
  return NextResponse.json(certs);
}
