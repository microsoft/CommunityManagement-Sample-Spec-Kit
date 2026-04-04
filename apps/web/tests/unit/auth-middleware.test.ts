import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock getServerSession before importing the module under test
vi.mock("@/lib/auth/session", () => ({
  getServerSession: vi.fn(),
}));

import { requireAuth, type AuthContext } from "@/lib/auth/middleware";
import { getServerSession } from "@/lib/auth/session";

const mockGetServerSession = vi.mocked(getServerSession);

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const handler = vi.fn();
    const wrappedHandler = requireAuth(handler);
    const req = new NextRequest("http://localhost:3000/api/test");

    const response = await wrappedHandler(req);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler with userId when session exists", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-123" });

    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ ok: true }),
    );
    const wrappedHandler = requireAuth(handler);
    const req = new NextRequest("http://localhost:3000/api/test");

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(req, { userId: "user-123" });
  });

  it("passes the original request through to the handler", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-456" });

    let capturedReq: NextRequest | null = null;
    let capturedCtx: AuthContext | null = null;

    const handler = vi.fn().mockImplementation(async (req: NextRequest, ctx: AuthContext) => {
      capturedReq = req;
      capturedCtx = ctx;
      return NextResponse.json({ received: true });
    });

    const wrappedHandler = requireAuth(handler);
    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    await wrappedHandler(req);

    expect(capturedReq).toBe(req);
    expect(capturedCtx).toEqual({ userId: "user-456" });
  });

  it("returns 401 response with correct JSON body", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const handler = vi.fn();
    const wrappedHandler = requireAuth(handler);
    const req = new NextRequest("http://localhost:3000/api/test");

    const response = await wrappedHandler(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBeDefined();
  });

  it("propagates handler response unchanged", async () => {
    mockGetServerSession.mockResolvedValue({ userId: "user-789" });

    const customResponse = NextResponse.json(
      { data: "custom" },
      { status: 201, headers: { "X-Custom": "header" } },
    );
    const handler = vi.fn().mockResolvedValue(customResponse);
    const wrappedHandler = requireAuth(handler);
    const req = new NextRequest("http://localhost:3000/api/test");

    const response = await wrappedHandler(req);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data).toBe("custom");
  });
});
