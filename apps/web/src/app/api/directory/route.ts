import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { searchDirectory } from "@/lib/directory/service";
import { directorySearchSchema } from "@/lib/validation/directory-schemas";
import { fromZodError } from "@/lib/errors";

export const GET = requireAuth(async (req: NextRequest, { userId }) => {
  const { searchParams } = req.nextUrl;
  const params = Object.fromEntries(searchParams.entries());

  const parsed = directorySearchSchema.safeParse(params);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const result = await searchDirectory(userId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/directory]", err);
    return NextResponse.json({ error: "Failed to load directory" }, { status: 500 });
  }
});
