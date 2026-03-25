/**
 * DELETE /api/auth/link/:id — Unlink a secondary social identity
 * Spec: 011-entra-external-id (T026)
 *
 * Constitution XI: Resource ownership check — user can only unlink their own accounts.
 * Guard against removing last identity to prevent lockout.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { unlinkAccount, LinkAccountError } from "@/lib/auth/link-account";
import { unauthorized, conflict } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams,
) {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const { id: linkedAccountId } = await params;

  if (!linkedAccountId) {
    return NextResponse.json(
      { error: "Missing linked account ID" },
      { status: 400 },
    );
  }

  try {
    const result = await unlinkAccount({
      userId: session.userId,
      linkedAccountId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof LinkAccountError) {
      if (err.code === "AUTH_REQUIRED") {
        return unauthorized(err.detail);
      }
      if (err.code === "UNLINK_LAST_IDENTITY") {
        return conflict(err.detail);
      }
    }
    throw err;
  }
}
