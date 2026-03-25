/**
 * GET /api/auth/link/list — List linked social accounts for the authenticated user
 * Spec: 011-entra-external-id
 *
 * Returns all secondary social identities linked to the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { listLinkedAccounts } from "@/lib/auth/link-account";
import type { AuthContext } from "@/lib/auth/middleware";

export const GET = requireAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const accounts = await listLinkedAccounts(ctx.userId);

  return NextResponse.json(
    {
      linkedAccounts: accounts.map((a) => ({
        id: a.id,
        userId: a.userId,
        provider: a.provider,
        providerOid: a.providerOid,
        linkedAt: a.linkedAt,
      })),
    },
    { status: 200 },
  );
});
