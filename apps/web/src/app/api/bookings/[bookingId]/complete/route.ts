import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { completeBookingPayment } from "@/lib/bookings/service";
import { unauthorized } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

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
