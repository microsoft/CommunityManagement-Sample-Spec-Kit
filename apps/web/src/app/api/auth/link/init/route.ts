/**
 * GET /api/auth/link/init — Issue a short-lived CSRF token for account linking
 * Spec: 011-entra-external-id (T025)
 *
 * Returns a link token that the client includes in the subsequent POST /api/auth/link.
 * Token is stored server-side (in-process) with 10-minute expiry.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { generateLinkToken } from "@/lib/auth/link-token-store";
import type { AuthContext } from "@/lib/auth/middleware";

export const GET = requireAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const { linkToken, expiresAt } = generateLinkToken(ctx.userId);

  return NextResponse.json(
    { linkToken, expiresAt },
    { status: 200 },
  );
});
