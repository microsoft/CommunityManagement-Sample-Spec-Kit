import { NextRequest, NextResponse } from "next/server";
import { createEventGroup, listEventGroups } from "@/lib/event-groups/service";
import { createEventGroupSchema } from "@/lib/validation/recurring-schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? undefined;
  const createdBy = searchParams.get("createdBy") ?? undefined;

  const groups = await listEventGroups({ type, createdBy });
  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createEventGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await createEventGroup(parsed.data, userId);
  return NextResponse.json(group, { status: 201 });
}
