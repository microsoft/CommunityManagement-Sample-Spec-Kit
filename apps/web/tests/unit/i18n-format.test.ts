/**
 * Unit tests for shared i18n formatting helpers.
 * Spec 014 — Task T001
 *
 * Tests formatEventDate, formatCurrency, formatRelativeTime, formatNumber
 * with explicit locale and timezone parameters.
 */
import { describe, it, expect } from "vitest";
import {
  formatEventDate,
  formatCurrency,
  formatRelativeTime,
  formatNumber,
} from "@acroyoga/shared/utils/format";

describe("formatEventDate", () => {
  const iso = "2026-04-15T14:30:00Z";

  it("formats with default locale (en)", () => {
    const result = formatEventDate(iso, "en", "UTC");
    expect(result).toContain("Apr");
    expect(result).toContain("15");
  });

  it("formats with Spanish locale", () => {
    const result = formatEventDate(iso, "es", "UTC");
    expect(result).toContain("abr");
    expect(result).toContain("15");
  });

  it("respects timezone parameter", () => {
    // 14:30 UTC is 10:30 in New York (EDT)
    const utcResult = formatEventDate(iso, "en", "UTC");
    const nyResult = formatEventDate(iso, "en", "America/New_York");
    expect(utcResult).not.toBe(nyResult);
  });

  it("accepts custom DateTimeFormat options", () => {
    const result = formatEventDate(iso, "en", "UTC", {
      weekday: "long",
      year: "numeric",
    });
    expect(result).toContain("Wednesday");
    expect(result).toContain("2026");
  });

  it("returns raw string for invalid dates", () => {
    expect(formatEventDate("not-a-date", "en")).toBe("not-a-date");
  });
});

describe("formatCurrency", () => {
  it("formats USD in English", () => {
    const result = formatCurrency(25.5, "USD", "en");
    expect(result).toContain("25");
    expect(result).toMatch(/\$|USD/);
  });

  it("formats EUR in Spanish", () => {
    const result = formatCurrency(100, "EUR", "es");
    expect(result).toContain("100");
  });

  it("formats JPY without decimals", () => {
    const result = formatCurrency(1000, "JPY", "en");
    expect(result).toContain("1,000");
    expect(result).not.toContain(".");
  });

  it("returns fallback for invalid currency code", () => {
    expect(formatCurrency(50, "XY", "en")).toBe("50 XY");
    expect(formatCurrency(50, "usd", "en")).toBe("50 usd");
  });

  it("handles zero amount", () => {
    const result = formatCurrency(0, "USD", "en");
    expect(result).toContain("0");
  });
});

describe("formatRelativeTime", () => {
  it("formats past time", () => {
    const result = formatRelativeTime(-3, "day", "en");
    expect(result).toContain("3 days ago");
  });

  it("formats future time", () => {
    const result = formatRelativeTime(2, "hour", "en");
    expect(result).toContain("in 2 hours");
  });

  it("formats 'yesterday' for -1 day", () => {
    const result = formatRelativeTime(-1, "day", "en");
    expect(result).toBe("yesterday");
  });

  it("formats in Spanish locale", () => {
    const result = formatRelativeTime(-3, "day", "es");
    expect(result).toContain("hace 3 días");
  });
});

describe("formatNumber", () => {
  it("formats with English grouping", () => {
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
  });

  it("formats with Spanish grouping", () => {
    const result = formatNumber(1234567, "es");
    // Spanish uses period or narrow no-break space for grouping
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("567");
  });

  it("applies custom options (percentage)", () => {
    const result = formatNumber(0.85, "en", { style: "percent" });
    expect(result).toBe("85%");
  });
});
