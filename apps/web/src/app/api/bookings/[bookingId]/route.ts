import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getBooking, cancelBooking, completeBookingPayment } from "@/lib/bookings/service";
import { unauthorized } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(booking);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  const userId = session.userId;

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const cancelled = await cancelBooking(bookingId, "credit");
    return NextResponse.json(cancelled);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancellation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
