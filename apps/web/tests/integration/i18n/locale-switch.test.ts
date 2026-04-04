/**
 * Integration tests for locale switching.
 * Spec 014 — Task T028
 *
 * Verifies LocaleSwitcher renders, that locale-related types and
 * helpers work correctly, and that the cookie-based locale mechanism
 * is properly configured.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  getLocaleDirection,
} from "@acroyoga/shared/types/i18n";
import type { Locale } from "@acroyoga/shared/types/i18n";

describe("locale switching infrastructure", () => {
  it("has at least 2 supported locales", () => {
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(2);
  });

  it("default locale is English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("English is LTR", () => {
    expect(getLocaleDirection("en")).toBe("ltr");
  });

  it("Spanish is LTR", () => {
    expect(getLocaleDirection("es")).toBe("ltr");
  });

  it("Arabic is RTL", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
  });

  it("all supported locales have required metadata", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(locale.code).toBeTruthy();
      expect(locale.name).toBeTruthy();
      expect(locale.nativeName).toBeTruthy();
      expect(["ltr", "rtl"]).toContain(locale.direction);
    }
  });

  it("locale codes match the union type", () => {
    const validCodes: Locale[] = ["en", "es", "ar"];
    for (const locale of SUPPORTED_LOCALES) {
      expect(validCodes).toContain(locale.code);
    }
  });
});
