import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { checkPermission } from "./service";
import { logAuditEvent } from "./audit";
import { forbidden, unauthorized } from "@/lib/errors";
import type { PermissionAction, Scope } from "@/types/permissions";

export interface PermissionContext {
  userId: string;
}

type ProtectedHandler = (
  req: NextRequest,
  ctx: PermissionContext,
) => Promise<NextResponse>;

type ScopeResolver = (req: NextRequest) => Promise<Scope> | Scope;

/**
 * Higher-order function that wraps a route handler with permission checking.
 * Extracts userId from session, resolves target scope, checks permission.
 * Returns 401 if not authenticated, 403 if denied (with audit log entry).
 */
export function withPermission(
  action: PermissionAction,
  scopeResolver: ScopeResolver,
) {
  return (handler: ProtectedHandler) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const session = await getServerSession();
      if (!session) {
        return unauthorized();
      }

      const targetScope = await scopeResolver(req);
      const result = await checkPermission(session.userId, {
        action,
        targetScope,
      });

      if (!result.allowed) {
        await logAuditEvent({
          action: "check_denied",
          userId: session.userId,
          role: result.effectiveRole === "visitor" ? null : result.effectiveRole,
          scopeType: targetScope.scopeType,
          scopeValue: targetScope.scopeValue,
          metadata: { deniedAction: action, path: req.nextUrl.pathname },
        });
        return forbidden();
      }

      return handler(req, { userId: session.userId });
    };
  };
}
