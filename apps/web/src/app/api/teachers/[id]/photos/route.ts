import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import type { TeacherPhoto } from "@acroyoga/shared/types/teachers";
import { unauthorized, badRequest, fromZodError } from "@/lib/errors";
import { z } from "zod";

const addPhotoSchema = z.object({
  url: z.string().url(),
  alt_text: z.string().max(255).optional(),
  display_order: z.number().int().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await db().query<TeacherPhoto>(
    `SELECT id, teacher_profile_id, url, sort_order, created_at
     FROM teacher_photos WHERE teacher_profile_id = $1
     ORDER BY sort_order`,
    [id],
  );
  return NextResponse.json(result.rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id } = await params;

  // Check max 10 photos
  const countResult = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM teacher_photos WHERE teacher_profile_id = $1`,
    [id],
  );
  if (parseInt(countResult.rows[0].count, 10) >= 10) {
    return badRequest("Maximum 10 photos allowed");
  }

  const body = await request.json();
  const parsed = addPhotoSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const maxOrder = await db().query<{ max_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) as max_order FROM teacher_photos WHERE teacher_profile_id = $1`,
    [id],
  );

  const sortOrder = parsed.data.display_order ?? maxOrder.rows[0].max_order + 1;

  const result = await db().query<TeacherPhoto>(
    `INSERT INTO teacher_photos (teacher_profile_id, url, sort_order)
     VALUES ($1, $2, $3)
     RETURNING id, teacher_profile_id, url, sort_order, created_at`,
    [id, parsed.data.url, sortOrder],
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
