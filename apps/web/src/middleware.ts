/**
 * Next.js Middleware — Authentication Guard
 * Spec: 011-entra-external-id (T014)
 *
 * Redirects unauthenticated users visiting page routes to /login?callbackUrl=[path].
 * API routes return 401 JSON; they are guarded by requireAuth() in the route handler.
 *
 * Mock auth (Spec 007): When ENTRA_CLIENT_ID is absent, the middleware is a no-op
 * to allow the dev mock auth switcher to function freely.
 *
 * Constitution IV: Server-side authority — identity is resolved from the JWT token.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

// Routes that should never be intercepted
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth",      // NextAuth route (all sub-paths)
  "/api/health",
  "/api/ready",
]);

function isPublicPath(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Prefix match for NextAuth routes and static assets
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/public/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // R-8: When ENTRA_CLIENT_ID is absent, mock auth is active — no redirects
  if (!process.env.ENTRA_CLIENT_ID) {
    return NextResponse.next();
  }

  // Skip public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Skip API routes — they handle auth themselves via requireAuth()
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check session
  const session = await auth();
  if (session?.user?.id) {
    return NextResponse.next();
  }

  // Redirect unauthenticated page-route requests to /login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match all paths except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
