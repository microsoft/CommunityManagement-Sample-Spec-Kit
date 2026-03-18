import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { createBooking, listUserBookings } from "@/lib/bookings/service";
import { bookTicketSchema } from "@/lib/validation/recurring-schemas";
import { fromZodError, badRequest } from "@/lib/errors";

export const GET = requireAuth(async (_req, { userId }) => {
  const bookings = await listUserBookings(userId);
  return NextResponse.json(bookings);
});

export const POST = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = bookTicketSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const booking = await createBooking(userId, parsed.data);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking failed";
    return badRequest(message);
  }
});
