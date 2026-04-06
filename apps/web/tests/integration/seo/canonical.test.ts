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
});

describe("buildAlternateLanguages", () => {
  it("returns all four hreflang keys pointing to same URL", () => {
    const result = buildAlternateLanguages("/events/123");
    expect(result.en).toEqual(result.es);
    expect(result.en).toEqual(result.ar);
    expect(result.en).toEqual(result["x-default"]);
  });
});
