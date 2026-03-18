import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getCertification, updateCertification, deleteCertification } from "@/lib/teachers/certifications";
import { updateCertificationSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> },
) {
  const { certId } = await params;
  const cert = await getCertification(certId);
  if (!cert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(cert);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { certId } = await params;
  const body = await request.json();
  const parsed = updateCertificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cert = await updateCertification(certId, parsed.data);
  if (!cert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(cert);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { certId } = await params;
  const deleted = await deleteCertification(certId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
