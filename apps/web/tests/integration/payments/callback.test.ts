/**
 * Integration tests for GET /api/payments/callback — Stripe OAuth callback
 *
 * Tests redirect behavior for:
 * - Error from Stripe → redirect with error description
 * - Missing code/state → redirect with missing_params error
 * - Successful callback → redirect with success status
 * - handleCallback failure → redirect with connection_failed error
 *
 * Constitution II (Test-First), XII (Financial Integrity)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock handleCallback to avoid real Stripe API calls
vi.mock("@/lib/payments/stripe-connect", () => ({
  handleCallback: vi.fn(),
}));

import { handleCallback } from "@/lib/payments/stripe-connect";
const mockHandleCallback = vi.mocked(handleCallback);

describe("GET /api/payments/callback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  async function callCallback(searchParams: Record<string, string>) {
    const url = new URL("http://localhost/api/payments/callback");
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
    const request = new NextRequest(url);
    const { GET } = await import("@/app/api/payments/callback/route");
    return GET(request);
  }

  it("redirects with error description when Stripe returns an error", async () => {
    const response = await callCallback({
      error: "access_denied",
      error_description: "User denied access",
    });

    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("/settings/creator");
    expect(location).toContain("error=User%20denied%20access");
  });

  it("uses default error description when none provided", async () => {
    const response = await callCallback({
      error: "access_denied",
    });

    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("error=Unknown%20error");
  });

  it("redirects with missing_params when code is absent", async () => {
    const response = await callCallback({
      state: "user-123",
    });

    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("error=missing_params");
  });

  it("redirects with missing_params when state is absent", async () => {
    const response = await callCallback({
      code: "auth_code_123",
    });

    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("error=missing_params");
  });

  it("redirects with success when handleCallback succeeds", async () => {
    mockHandleCallback.mockResolvedValue({
      id: "pay_1",
      userId: "user-123",
      stripeAccountId: "acct_test",
      onboardingComplete: false,
      connectedAt: new Date().toISOString(),
      disconnectedAt: null,
    });

    const response = await callCallback({
      code: "auth_code_123",
      state: "user-123",
    });

    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("status=success");
    expect(mockHandleCallback).toHaveBeenCalledWith("auth_code_123", "user-123");
  });

  it("redirects with connection_failed when handleCallback throws", async () => {
    mockHandleCallback.mockRejectedValue(new Error("Stripe API error"));

    const response = await callCallback({
      code: "bad_code",
      state: "user-123",
    });

    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("error=connection_failed");
  });
});
