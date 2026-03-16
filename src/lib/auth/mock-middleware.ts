import { NextRequest, NextResponse } from "next/server";
import { findUserBySlug, isMockAuthEnabled, DEFAULT_MOCK_USER } from "./mock-users";

export function handleMockUserParam(req: NextRequest): NextResponse | null {
  if (!isMockAuthEnabled()) return null;

  const url = req.nextUrl.clone();
  const mockSlug = url.searchParams.get("mockUser");
  if (!mockSlug) return null;

  // Strip the query param
  url.searchParams.delete("mockUser");

  const user = findUserBySlug(mockSlug);
  const userId = user?.id ?? DEFAULT_MOCK_USER.id;

  // Handle anonymous
  const cookieValue = mockSlug === "anonymous" ? "anonymous" : userId;

  const response = NextResponse.redirect(url);
  response.cookies.set("mock-user-id", cookieValue, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
