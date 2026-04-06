import { describe, it, expect } from "vitest";
import { buildCanonicalUrl, buildAlternateLanguages } from "@/lib/seo/canonical";

describe("buildCanonicalUrl", () => {
  it("prepends BASE_URL to path", () => {
    const url = buildCanonicalUrl("/events/123");
    expect(url).toMatch(/\/events\/123$/);
  });

  it("strips /en locale prefix", () => {
    const url = buildCanonicalUrl("/en/events/123");
    expect(url).not.toContain("/en/");
    expect(url).toContain("/events/123");
  });

  it("strips /es locale prefix", () => {
    const url = buildCanonicalUrl("/es/teachers/abc");
    expect(url).not.toContain("/es/");
    expect(url).toContain("/teachers/abc");
  });

  it("strips /ar locale prefix", () => {
    const url = buildCanonicalUrl("/ar/events/456");
    expect(url).not.toContain("/ar/");
    expect(url).toContain("/events/456");
  });

  it("event canonical is self-referential", () => {
    const url = buildCanonicalUrl("/events/evt-001");
    expect(url).toMatch(/\/events\/evt-001$/);
  });

  it("teacher canonical is self-referential", () => {
    const url = buildCanonicalUrl("/teachers/tp-001");
    expect(url).toMatch(/\/teachers\/tp-001$/);
  });

  it("events list canonical is /events", () => {
    const url = buildCanonicalUrl("/events");
    expect(url).toMatch(/\/events$/);
  });

  it("teachers list canonical is /teachers", () => {
    const url = buildCanonicalUrl("/teachers");
    expect(url).toMatch(/\/teachers$/);
  });
});

describe("buildAlternateLanguages", () => {
  it("returns all four hreflang keys pointing to same URL", () => {
    const result = buildAlternateLanguages("/events/123");
    expect(result.en).toEqual(result.es);
    expect(result.en).toEqual(result.ar);
    expect(result.en).toEqual(result["x-default"]);
  });

  it("has exactly four keys", () => {
    const result = buildAlternateLanguages("/teachers/tp-001");
    expect(Object.keys(result)).toHaveLength(4);
    expect(result).toHaveProperty("en");
    expect(result).toHaveProperty("es");
    expect(result).toHaveProperty("ar");
    expect(result).toHaveProperty("x-default");
  });

  it("alternate URLs match canonical for same path", () => {
    const path = "/events/evt-002";
    const canonical = buildCanonicalUrl(path);
    const alternates = buildAlternateLanguages(path);
    expect(alternates.en).toBe(canonical);
  });
});
