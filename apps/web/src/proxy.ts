import { NextRequest, NextResponse } from "next/server";
import { handleMockUserParam } from "@/lib/auth/mock-middleware";

export function proxy(req: NextRequest): NextResponse | undefined {
  // Mock auth query parameter handling (dev only — no-op in production)
  const mockResponse = handleMockUserParam(req);
  if (mockResponse) return mockResponse;

  return undefined;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
