/**
 * Integration tests for POST /api/auth/mobile-token
 * Spec: 016-mobile-app (T008)
 *
 * Tests MUST fail before implementation (TDD — Constitution II).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth session
const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

// Dynamic import to pick up mocks
const routeModule = () =>
  import("../../../src/app/api/auth/mobile-token/route");

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/mobile-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/mobile-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { POST } = await routeModule();
    const response = await POST(makeRequest({ grantType: "session_exchange" }));
    expect(response.status).toBe(401);
  });

  it("issues token pair for authenticated session_exchange", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({ grantType: "session_exchange" }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("token");
    expect(body).toHaveProperty("refreshToken");
    expect(body).toHaveProperty("expiresAt");
    expect(typeof body.token).toBe("string");
    expect(typeof body.refreshToken).toBe("string");
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects invalid grantType", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({ grantType: "invalid_grant" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects refresh_token grant without refreshToken", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({ grantType: "refresh_token" }),
    );
    expect(response.status).toBe(400);
  });

  it("refreshes token with valid refresh token", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();

    // First, get a token pair
    const initialResponse = await POST(
      makeRequest({ grantType: "session_exchange" }),
    );
    const initial = await initialResponse.json();
    expect(initial.refreshToken).toBeDefined();

    // Now refresh
    const refreshResponse = await POST(
      makeRequest({
        grantType: "refresh_token",
        refreshToken: initial.refreshToken,
      }),
    );
    expect(refreshResponse.status).toBe(200);

    const refreshed = await refreshResponse.json();
    expect(refreshed.token).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
    // Rotated: new refresh token should differ from old
    expect(refreshed.refreshToken).not.toBe(initial.refreshToken);
  });

  it("rejects invalid refresh token", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({
        grantType: "refresh_token",
        refreshToken: "invalid-token",
      }),
    );
    expect(response.status).toBe(401);
  });
});
