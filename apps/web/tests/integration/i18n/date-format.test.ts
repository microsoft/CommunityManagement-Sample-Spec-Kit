/**
 * Integration tests for date formatting in event display.
 * Spec 014 — Task T018
 *
 * Verifies formatEventDate output matches expected Intl.DateTimeFormat
 * behavior for event cards and detail pages.
 */
import { describe, it, expect } from "vitest";
import { formatEventDate, formatCurrency } from "@acroyoga/shared/utils/format";

describe("date formatting in event display", () => {
  const isoDate = "2026-06-15T14:30:00Z";

  it("default format includes month and day", () => {
    const result = formatEventDate(isoDate, "en", "UTC");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });

  it("date-only format for event groups", () => {
    const result = formatEventDate(isoDate, "en", "UTC", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("time-only format for occurrences", () => {
    const result = formatEventDate(isoDate, "en", "UTC", {
      hour: "numeric",
      minute: "2-digit",
    });
    // Should contain time, not date
    expect(result).toMatch(/\d+:\d+/);
  });

  it("Spanish locale date formatting", () => {
    const result = formatEventDate(isoDate, "es", "UTC");
    expect(result).toContain("jun");
    expect(result).toContain("15");
  });

  it("Arabic locale date formatting", () => {
    const result = formatEventDate(isoDate, "ar", "UTC");
    // Arabic should produce valid output (may use Arabic numerals)
    expect(result.length).toBeGreaterThan(0);
  });

  it("currency formatting for event costs", () => {
    expect(formatCurrency(0, "USD", "en")).toContain("0");
    expect(formatCurrency(25.5, "USD", "en")).toContain("25");
    expect(formatCurrency(1000, "JPY", "en")).toContain("1,000");
  });
});
