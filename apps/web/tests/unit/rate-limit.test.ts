import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";

function makeRequest(ip?: string): NextRequest {
  const headers = new Headers();
  if (ip) {
    headers.set("x-forwarded-for", ip);
  }
  return new NextRequest("http://localhost:3000/api/test", { headers });
}

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset the module-level store by advancing time past any existing windows
    vi.useFakeTimers();
    vi.advanceTimersByTime(120_000);
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const req = makeRequest("10.0.0.1");
    const result = rateLimit(req);
    expect(result).toBeNull();
  });

  it("allows up to 100 requests in a window", () => {
    for (let i = 0; i < 100; i++) {
      const result = rateLimit(makeRequest("10.0.0.2"));
      expect(result).toBeNull();
    }
  });

  it("returns 429 after exceeding the limit", () => {
    for (let i = 0; i < 100; i++) {
      rateLimit(makeRequest("10.0.0.3"));
    }
    const result = rateLimit(makeRequest("10.0.0.3"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("includes Retry-After and rate limit headers on 429", async () => {
    for (let i = 0; i < 101; i++) {
      rateLimit(makeRequest("10.0.0.4"));
    }
    const result = rateLimit(makeRequest("10.0.0.4"));
    expect(result).not.toBeNull();
    expect(result!.headers.get("Retry-After")).toBeTruthy();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("returns correct error body on 429", async () => {
    for (let i = 0; i < 101; i++) {
      rateLimit(makeRequest("10.0.0.5"));
    }
    const result = rateLimit(makeRequest("10.0.0.5"));
    const body = await result!.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.message).toContain("Too many requests");
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 100; i++) {
      rateLimit(makeRequest("10.0.0.6"));
    }
    // IP 10.0.0.6 is at limit, but 10.0.0.7 should be fresh
    const result = rateLimit(makeRequest("10.0.0.7"));
    expect(result).toBeNull();
  });

  it("extracts IP from x-forwarded-for header (first entry)", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "1.2.3.4, 5.6.7.8");
    const req = new NextRequest("http://localhost:3000/api/test", { headers });
    const result = rateLimit(req);
    expect(result).toBeNull();
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers();
    headers.set("x-real-ip", "9.8.7.6");
    const req = new NextRequest("http://localhost:3000/api/test", { headers });
    const result = rateLimit(req);
    expect(result).toBeNull();
  });

  it("uses 'unknown' when no IP headers present", () => {
    const req = new NextRequest("http://localhost:3000/api/test");
    const result = rateLimit(req);
    expect(result).toBeNull();
  });

  it("resets count after window expires", () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 100; i++) {
        rateLimit(makeRequest("10.0.0.8"));
      }
      // At the limit — next request would be blocked
      const blocked = rateLimit(makeRequest("10.0.0.8"));
      expect(blocked).not.toBeNull();

      // Advance past the 60s window
      vi.advanceTimersByTime(61_000);

      // Should be allowed again
      const allowed = rateLimit(makeRequest("10.0.0.8"));
      expect(allowed).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
