import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { setDirectoryVisibility, getDirectoryVisibility } from "@/lib/directory/service";
import { setDirectoryVisibilitySchema } from "@/lib/validation/directory-schemas";
import { fromZodError } from "@/lib/errors";

export const GET = requireAuth(async (_req: NextRequest, { userId }) => {
  try {
    const visible = await getDirectoryVisibility(userId);
    return NextResponse.json({ visible });
  } catch (err) {
    console.error("[GET /api/directory/visibility]", err);
    return NextResponse.json({ error: "Failed to get visibility" }, { status: 500 });
  }
});

export const PATCH = requireAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = setDirectoryVisibilitySchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const visible = await setDirectoryVisibility(userId, parsed.data.visible);
    return NextResponse.json({ visible });
  } catch (err) {
    console.error("[PATCH /api/directory/visibility]", err);
    return NextResponse.json({ error: "Failed to update visibility" }, { status: 500 });
  }
});
