import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getMyProfile, upsertProfile } from "@/lib/profiles/service";
import { updateProfileSchema } from "@/lib/validation/community-schemas";
import { fromZodError } from "@/lib/errors";

export const GET = requireAuth(async (_req, { userId }) => {
  const profile = await getMyProfile(userId);
  return NextResponse.json(profile);
});

export const PUT = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const profile = await upsertProfile(userId, parsed.data);
  return NextResponse.json({ profile });
});
