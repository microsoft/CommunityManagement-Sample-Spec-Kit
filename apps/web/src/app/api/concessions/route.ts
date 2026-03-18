import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import {
  applyConcession,
  getConcessionStatus,
  listPendingConcessions,
} from "@/lib/concessions/service";
import { concessionApplicationSchema } from "@/lib/validation/recurring-schemas";
import { fromZodError, badRequest } from "@/lib/errors";

export const GET = requireAuth(async (req, { userId }) => {
  const { searchParams } = req.nextUrl;
  const listPending = searchParams.get("pending") === "true";

  if (listPending) {
    const pending = await listPendingConcessions();
    return NextResponse.json(pending);
  }

  const status = await getConcessionStatus(userId);
  return NextResponse.json(status);
});

export const POST = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = concessionApplicationSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const concession = await applyConcession(userId, parsed.data);
    return NextResponse.json(concession, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Application failed";
    return badRequest(message);
  }
});
