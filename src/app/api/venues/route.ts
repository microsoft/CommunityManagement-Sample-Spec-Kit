import { NextRequest, NextResponse } from "next/server";
import { listVenues, createVenue } from "@/lib/venues/service";
import { createVenueSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const venues = await listVenues({
    cityId: searchParams.get("cityId") ?? undefined,
    createdBy: searchParams.get("createdBy") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });

  return NextResponse.json({ venues });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createVenueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const venue = await createVenue(parsed.data, userId);
  return NextResponse.json(venue, { status: 201 });
}
