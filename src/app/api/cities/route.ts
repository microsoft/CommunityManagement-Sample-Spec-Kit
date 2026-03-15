import { NextRequest, NextResponse } from "next/server";
import { listCities } from "@/lib/cities/service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const cities = await listCities({
    countryCode: searchParams.get("country") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    activeOnly: searchParams.get("activeOnly") === "true",
  });

  return NextResponse.json({ cities });
}
