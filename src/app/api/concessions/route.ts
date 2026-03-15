import { NextRequest, NextResponse } from "next/server";
import {
  applyConcession,
  getConcessionStatus,
  listPendingConcessions,
} from "@/lib/concessions/service";
import { concessionApplicationSchema } from "@/lib/validation/recurring-schemas";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const listPending = searchParams.get("pending") === "true";

  if (listPending) {
    const pending = await listPendingConcessions();
    return NextResponse.json(pending);
  }

  const status = await getConcessionStatus(userId);
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = concessionApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const concession = await applyConcession(userId, parsed.data);
    return NextResponse.json(concession, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Application failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
