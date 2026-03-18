import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { listVenues, createVenue } from "@/lib/venues/service";
import { createVenueSchema } from "@/lib/validation/schemas";
import { fromZodError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const venues = await listVenues({
    cityId: searchParams.get("cityId") ?? undefined,
    createdBy: searchParams.get("createdBy") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });

  return NextResponse.json({ venues });
}

export const POST = requireAuth(async (request, { userId }) => {
  const body = await request.json();
  const parsed = createVenueSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const venue = await createVenue(parsed.data, userId);
  return NextResponse.json(venue, { status: 201 });
});
