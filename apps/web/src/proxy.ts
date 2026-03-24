/**
 * Next.js Proxy (Middleware) — Authentication Guard + Mock Auth
 * Spec: 011-entra-external-id (T014)
 *
 * Merges Spec 007 mock user param handling with Spec 011 auth redirect guard.
 *
 * When ENTRA_CLIENT_ID is absent (local dev / mock auth), only the mock user
 * param handler runs — no auth redirects.
 *
 * When ENTRA_CLIENT_ID is present, unauthenticated users visiting page routes
 * are redirected to /login?callbackUrl=[path].
 * API routes return 401 JSON; they are guarded by requireAuth() in the route handler.
 *
 * Constitution IV: Server-side authority — identity is resolved from the JWT token.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleMockUserParam } from "@/lib/auth/mock-middleware";
import { auth } from "@/lib/auth/config";

// Routes that should never be intercepted by the auth guard
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth",
  "/api/health",
  "/api/ready",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/public/")) return true;
  return false;
}

export async function proxy(req: NextRequest): Promise<NextResponse | undefined> {
  // Mock auth query parameter handling (dev only — no-op in production)
  const mockResponse = handleMockUserParam(req);
  if (mockResponse) return mockResponse;

  // R-8: When ENTRA_CLIENT_ID is absent, mock auth is active — no redirects
  if (!process.env.ENTRA_CLIENT_ID) {
    return undefined;
  }

  const { pathname } = req.nextUrl;

  // Skip public paths and API routes (they self-guard via requireAuth())
  if (isPublicPath(pathname) || pathname.startsWith("/api/")) {
    return undefined;
  }

  // Check session and redirect unauthenticated requests to /login
  const session = await auth();
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return undefined;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
