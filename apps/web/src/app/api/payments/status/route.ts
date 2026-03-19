import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getPaymentStatus } from "@/lib/payments/stripe-connect";
import { unauthorized } from "@/lib/errors";

// --- GET /api/payments/status --- (T057)

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const status = await getPaymentStatus(session.userId);
  return NextResponse.json(status);
}
