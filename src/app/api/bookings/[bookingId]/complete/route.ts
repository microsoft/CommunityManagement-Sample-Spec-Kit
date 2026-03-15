import { NextRequest, NextResponse } from "next/server";
import { completeBookingPayment } from "@/lib/bookings/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const body = await request.json();
  const stripeChargeId = body.stripeChargeId;

  if (!stripeChargeId || typeof stripeChargeId !== "string") {
    return NextResponse.json({ error: "stripeChargeId is required" }, { status: 400 });
  }

  const booking = await completeBookingPayment(bookingId, stripeChargeId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found or not pending" }, { status: 404 });
  }

  return NextResponse.json(booking);
}
