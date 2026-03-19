import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { unauthorized } from "@/lib/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { photoId } = await params;
  const existing = await db().query(`SELECT id FROM teacher_photos WHERE id = $1`, [photoId]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db().query(`DELETE FROM teacher_photos WHERE id = $1`, [photoId]);
  return NextResponse.json({ success: true });
}
