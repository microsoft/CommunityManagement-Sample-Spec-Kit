import { NextRequest, NextResponse } from "next/server";
import { getVenueById, updateVenue, deleteVenue } from "@/lib/venues/service";
import { updateVenueSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const venue = await getVenueById(id);
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }
  return NextResponse.json(venue);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getVenueById(id);
  if (!existing) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }
  if (existing.createdBy !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateVenueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateVenue(id, parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getVenueById(id);
  if (!existing) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }
  if (existing.createdBy !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteVenue(id);
  return new NextResponse(null, { status: 204 });
}
