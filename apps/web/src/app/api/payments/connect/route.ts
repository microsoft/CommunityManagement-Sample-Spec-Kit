import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/permissions/service";
import { initiateConnect, getPaymentStatus } from "@/lib/payments/stripe-connect";
import { conflict, forbidden, unauthorized } from "@/lib/errors";

// --- POST /api/payments/connect --- (T055)

export async function POST(_req: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  // Must have event_creator grant
  const permCheck = await checkPermission(session.userId, {
    action: "createEvent",
    targetScope: { scopeType: "global", scopeValue: null },
  });
  if (!permCheck.allowed) return forbidden("Must be an Event Creator to connect Stripe");

  // Check not already connected
  const status = await getPaymentStatus(session.userId);
  if (status.connected) return conflict("Already connected to Stripe");

  const redirectUrl = initiateConnect(session.userId);
  return NextResponse.json({ redirectUrl });
}
