/**
 * POST /api/auth/link — Link a secondary social identity to the user account
 * Spec: 011-entra-external-id (T024)
 *
 * Constitution IV: requireAuth() guard; all identity validation is server-side.
 * Constitution I: API-first — typed request/response shapes from contracts.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";
import { linkAccount, LinkAccountError } from "@/lib/auth/link-account";
import { getLinkToken, consumeLinkToken } from "@/lib/auth/link-token-store";
import { unauthorized, conflict, fromZodError } from "@/lib/errors";
import type { AuthContext } from "@/lib/auth/middleware";

const LinkRequestSchema = z.object({
  linkToken: z.string().min(1),
  providerOid: z.string().min(1),
  provider: z.enum(["google", "facebook", "apple"]),
});

export const POST = requireAuth(async (req: NextRequest, ctx: AuthContext) => {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const parsed = LinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const { linkToken, providerOid, provider } = parsed.data;

  // Validate the link token server-side (CSRF protection)
  const storedToken = await getLinkToken(ctx.userId);
  const validToken = storedToken === linkToken;

  if (validToken) {
    // Consume the token (single-use)
    await consumeLinkToken(ctx.userId);
  }

  try {
    const result = await linkAccount({
      userId: ctx.userId,
      providerOid,
      provider,
      linkToken,
      validToken,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof LinkAccountError) {
      if (err.code === "LINK_CONFLICT") {
        return conflict(err.detail);
      }
      if (err.code === "INVALID_LINK_TOKEN") {
        return NextResponse.json(
          { error: err.detail, code: "INVALID_LINK_TOKEN" },
          { status: 422 },
        );
      }
      if (err.code === "AUTH_REQUIRED") {
        return unauthorized(err.detail);
      }
    }
    throw err;
  }
});
