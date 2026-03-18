import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { detectHomeCity } from "@/lib/profiles/service";
import { detectCitySchema } from "@/lib/validation/community-schemas";
import { fromZodError } from "@/lib/errors";

export const POST = requireAuth(async (req, { userId: _userId }) => {
  const body = await req.json();
  const parsed = detectCitySchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const result = await detectHomeCity(parsed.data.lat, parsed.data.lon);
  return NextResponse.json(result);
});
