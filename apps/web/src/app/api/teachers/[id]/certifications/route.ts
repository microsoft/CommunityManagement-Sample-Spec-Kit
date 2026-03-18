import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listCertifications, createCertification } from "@/lib/teachers/certifications";
import { createCertificationSchema } from "@/lib/validation/teacher-schemas";
import { unauthorized } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const certs = await listCertifications(id);
  return NextResponse.json(certs);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = createCertificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cert = await createCertification(id, parsed.data);
  return NextResponse.json(cert, { status: 201 });
}
