/**
 * Integration tests for protected route redirect behaviour
 * Spec: 011-entra-external-id, Phase 3 (T009)
 *
 * Tests MUST FAIL before implementation (TDD — Constitution II).
 *
 * NOTE: These tests verify the middleware redirect logic directly rather than
 * making HTTP requests, since Next.js middleware is not easily unit-tested via
 * HTTP in Vitest. The validateCallbackUrl utility is tested in isolation.
 */

import { describe, it, expect } from "vitest";
import { validateCallbackUrl } from "@/lib/auth/callback-url";

describe("callbackUrl validation (T009 + T015)", () => {
  const baseUrl = "http://localhost:3000";

  it("allows same-origin relative paths", () => {
    expect(validateCallbackUrl("/events", baseUrl)).toBe("/events");
    expect(validateCallbackUrl("/events/new", baseUrl)).toBe("/events/new");
    expect(validateCallbackUrl("/", baseUrl)).toBe("/");
  });

  it("allows same-origin absolute URLs", () => {
    expect(validateCallbackUrl("http://localhost:3000/events", baseUrl)).toBe(
      "http://localhost:3000/events",
    );
  });

  it("rejects external URLs", () => {
    expect(validateCallbackUrl("https://evil.com/steal", baseUrl)).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(validateCallbackUrl("//evil.com/steal", baseUrl)).toBe("/");
  });

  it("returns '/' when callbackUrl is absent", () => {
    expect(validateCallbackUrl(null, baseUrl)).toBe("/");
    expect(validateCallbackUrl(undefined, baseUrl)).toBe("/");
    expect(validateCallbackUrl("", baseUrl)).toBe("/");
  });

  it("rejects javascript: protocol URLs", () => {
    expect(validateCallbackUrl("javascript:alert(1)", baseUrl)).toBe("/");
  });
});
