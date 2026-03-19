import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { verifyCertification } from "@/lib/teachers/certifications";
import { verifyCertificationSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized, forbidden } from "@/lib/errors";
import { checkPermission } from "@/lib/permissions/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  // Admin-only endpoint
  const permResult = await checkPermission(userId, {
    action: "approveRequests",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permResult.allowed) return forbidden("Only admins can verify certifications");

  const { certId } = await params;
  const body = await request.json();
  const parsed = verifyCertificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cert = await verifyCertification(certId, userId, parsed.data.decision);
  if (!cert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(cert);
}
