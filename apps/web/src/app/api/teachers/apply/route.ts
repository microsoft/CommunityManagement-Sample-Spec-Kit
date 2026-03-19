import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { submitApplication } from "@/lib/teachers/applications";
import { submitApplicationSchema } from "@/lib/validation/teacher-schemas";
import { fromZodError, conflict } from "@/lib/errors";

export const POST = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = submitApplicationSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const result = await submitApplication(userId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return conflict(message);
  }
});
