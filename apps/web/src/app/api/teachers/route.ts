import { NextRequest, NextResponse } from "next/server";
import { searchTeachers } from "@/lib/teachers/profiles";
import { teacherSearchSchema } from "@/lib/validation/teacher-schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const params = Object.fromEntries(searchParams.entries());
  const parsed = teacherSearchSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await searchTeachers(parsed.data);
  return NextResponse.json(result);
}
