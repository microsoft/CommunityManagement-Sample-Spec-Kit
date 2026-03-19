import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { createEventGroup, listEventGroups } from "@/lib/event-groups/service";
import { createEventGroupSchema } from "@/lib/validation/recurring-schemas";
import { fromZodError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? undefined;
  const createdBy = searchParams.get("createdBy") ?? undefined;

  const groups = await listEventGroups({ type, createdBy });
  return NextResponse.json(groups);
}

export const POST = requireAuth(async (request, { userId }) => {
  const body = await request.json();
  const parsed = createEventGroupSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const group = await createEventGroup(parsed.data, userId);
  return NextResponse.json(group, { status: 201 });
});
