import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { setSocialLinks } from "@/lib/profiles/service";
import { setSocialLinksSchema } from "@/lib/validation/community-schemas";
import { fromZodError } from "@/lib/errors";

export const PUT = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = setSocialLinksSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const links = await setSocialLinks(userId, parsed.data.links);
  return NextResponse.json({ links });
});
