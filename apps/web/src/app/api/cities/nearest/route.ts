import { NextRequest, NextResponse } from "next/server";
import { findNearestCity } from "@/lib/cities/service";
import { nearestCitySchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = nearestCitySchema.safeParse({
    lat: searchParams.get("lat"),
    lon: searchParams.get("lon"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await findNearestCity(parsed.data.lat, parsed.data.lon);
  return NextResponse.json(result);
}
