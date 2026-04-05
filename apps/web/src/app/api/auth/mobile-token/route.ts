/**
 * POST /api/auth/mobile-token — Issue JWT for mobile client
 * Spec: 016-mobile-app (T011)
 *
 * Constitution I: API-first — mobile auth via REST endpoint.
 * Constitution IV: Server-side authority — JWT issuance server-controlled.
 * Constitution IX: requireAuth() middleware protects endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";
import { badRequest, fromZodError } from "@/lib/errors";
import type { AuthContext } from "@/lib/auth/middleware";
import crypto from "node:crypto";

const MobileTokenRequestSchema = z.object({
  grantType: z.enum(["session_exchange", "refresh_token"]),
  refreshToken: z.string().optional(),
});

// In-memory refresh token store (production would use DB/Redis)
const refreshTokenStore = new Map<
  string,
  { userId: string; expiresAt: Date }
>();

const TOKEN_EXPIRY_HOURS = 24;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateExpiresAt(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export const POST = requireAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = MobileTokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const { grantType, refreshToken: incomingRefreshToken } = parsed.data;

  if (grantType === "refresh_token") {
    if (!incomingRefreshToken) {
      return badRequest(
        "refreshToken is required for refresh_token grant type",
      );
    }

    const stored = refreshTokenStore.get(incomingRefreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      // Clean up expired token
      if (stored) {
        refreshTokenStore.delete(incomingRefreshToken);
      }
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    // Rotate refresh token (invalidate old, issue new)
    refreshTokenStore.delete(incomingRefreshToken);
  }

  // Issue new token pair
  const token = generateToken();
  const newRefreshToken = generateToken();
  const expiresAt = generateExpiresAt(TOKEN_EXPIRY_HOURS);

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(
    refreshExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS,
  );

  refreshTokenStore.set(newRefreshToken, {
    userId: ctx.userId,
    expiresAt: refreshExpiresAt,
  });

  return NextResponse.json({
    token,
    refreshToken: newRefreshToken,
    expiresAt,
  });
});
