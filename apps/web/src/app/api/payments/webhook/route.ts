import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateOnboardingStatus } from "@/lib/payments/stripe-connect";
import { STRIPE_API_VERSION } from "@/lib/payments/constants";

// --- POST /api/payments/webhook --- (T058)

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: STRIPE_API_VERSION });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const complete = account.charges_enabled && account.payouts_enabled;
    await updateOnboardingStatus(account.id, complete ?? false);
  }

  return NextResponse.json({ received: true });
}
