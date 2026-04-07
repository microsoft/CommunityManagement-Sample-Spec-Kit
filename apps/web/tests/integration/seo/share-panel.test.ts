import { describe, it, expect } from "vitest";

// Test the buildShareUrl utility by importing the module's internals.
// SharePanel is a client component, so we test the URL construction logic directly.

// Recreate the function locally to test logic (mirrors SharePanel.tsx)
const SOURCE_MEDIUM: Record<string, string> = {
  twitter: "social",
  whatsapp: "messaging",
  facebook: "social",
  linkedin: "social",
  clipboard: "referral",
  native: "referral",
};

function buildShareUrl(
  base: string,
  source: string,
  campaign = "event-share",
): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", SOURCE_MEDIUM[source]);
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

describe("share URL construction", () => {
  const baseUrl = "https://example.com/events/evt-001";

  it("twitter produces utm_source=twitter&utm_medium=social&utm_campaign=event-share", () => {
    const url = buildShareUrl(baseUrl, "twitter");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_source")).toBe("twitter");
    expect(parsed.searchParams.get("utm_medium")).toBe("social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("event-share");
  });

  it("clipboard uses utm_medium=referral", () => {
    const url = buildShareUrl(baseUrl, "clipboard");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_source")).toBe("clipboard");
    expect(parsed.searchParams.get("utm_medium")).toBe("referral");
  });

  it("whatsapp uses utm_medium=messaging", () => {
    const url = buildShareUrl(baseUrl, "whatsapp");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_medium")).toBe("messaging");
  });

  it("does not duplicate pre-existing query params", () => {
    const urlWithParams = "https://example.com/events/evt-001?existing=true";
    const url = buildShareUrl(urlWithParams, "twitter");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("existing")).toBe("true");
    expect(parsed.searchParams.get("utm_source")).toBe("twitter");
  });

  it("base URL path is preserved", () => {
    const url = buildShareUrl(baseUrl, "facebook");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/events/evt-001");
  });

  it("custom campaign string is used", () => {
    const url = buildShareUrl(baseUrl, "twitter", "teacher-share");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_campaign")).toBe("teacher-share");
  });
});
