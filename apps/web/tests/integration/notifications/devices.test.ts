/**
 * Integration tests for POST /api/notifications/devices
 * Spec: 016-mobile-app (T045)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

const routeModule = () =>
  import("../../../src/app/api/notifications/devices/route");

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/notifications/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/notifications/devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({ expoPushToken: "token", platform: "ios" }),
    );
    expect(response.status).toBe(401);
  });

  it("registers device token for authenticated user", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({
        expoPushToken: "ExponentPushToken[abc123]",
        platform: "ios",
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.registered).toBe(true);
    expect(body.token).toBe("ExponentPushToken[abc123]");
  });

  it("rejects invalid platform", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({
        expoPushToken: "ExponentPushToken[abc123]",
        platform: "windows",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects missing token", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({ platform: "android" }),
    );
    expect(response.status).toBe(400);
  });

  it("supports android platform", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-1" });
    const { POST } = await routeModule();
    const response = await POST(
      makeRequest({
        expoPushToken: "ExponentPushToken[def456]",
        platform: "android",
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.registered).toBe(true);
  });
});
