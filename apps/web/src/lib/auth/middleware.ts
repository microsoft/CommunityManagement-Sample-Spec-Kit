import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "./session";
import { unauthorized } from "@/lib/errors";

export interface AuthContext {
  userId: string;
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext,
) => Promise<NextResponse>;

export function requireAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = await getServerSession();
    if (!session) {
      return unauthorized();
    }
    return handler(req, { userId: session.userId });
  };
}
