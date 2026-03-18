import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/payments/stripe-connect";

// --- GET /api/payments/callback --- (T056)

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    const desc = req.nextUrl.searchParams.get("error_description") ?? "Unknown error";
    return NextResponse.redirect(
      new URL(`/settings/creator?error=${encodeURIComponent(desc)}`, req.nextUrl.origin),
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // userId

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/creator?error=missing_params", req.nextUrl.origin),
    );
  }

  try {
    await handleCallback(code, state);
    return NextResponse.redirect(
      new URL("/settings/creator?status=success", req.nextUrl.origin),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/settings/creator?error=connection_failed", req.nextUrl.origin),
    );
  }
}
