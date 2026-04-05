/**
 * Integration tests for RTL layout support.
 * Spec 014 — Task T029
 *
 * Verifies that the i18n infrastructure correctly handles RTL locales
 * and that the locale direction mapping is correct.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getLocaleDirection,
  SUPPORTED_LOCALES,
} from "@acroyoga/shared/types/i18n";

const MESSAGES_DIR = join(__dirname, "../../../messages");

describe("RTL layout support", () => {
  it("Arabic locale returns RTL direction", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
  });

  it("LTR locales return correct direction", () => {
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(getLocaleDirection("es")).toBe("ltr");
  });

  it("Arabic translation file exists", () => {
    const arPath = join(MESSAGES_DIR, "ar.json");
    const content = readFileSync(arPath, "utf-8");
    const ar = JSON.parse(content);
    expect(ar).toBeDefined();
    expect(ar.common).toBeDefined();
    expect(ar.nav).toBeDefined();
  });

  it("Arabic has key navigation strings translated", () => {
    const arPath = join(MESSAGES_DIR, "ar.json");
    const ar = JSON.parse(readFileSync(arPath, "utf-8"));

    // Verify Arabic text is present (not English fallback)
    expect(ar.nav.home).toBe("الرئيسية");
    expect(ar.nav.events).toBe("الفعاليات");
    expect(ar.common.signIn).toBe("تسجيل الدخول");
  });

  it("SUPPORTED_LOCALES includes at least one RTL locale", () => {
    const rtlLocales = SUPPORTED_LOCALES.filter((l) => l.direction === "rtl");
    expect(rtlLocales.length).toBeGreaterThanOrEqual(1);
  });

  it("all RTL locale translation files exist", () => {
    const rtlLocales = SUPPORTED_LOCALES.filter((l) => l.direction === "rtl");
    for (const locale of rtlLocales) {
      const filePath = join(MESSAGES_DIR, `${locale.code}.json`);
      const content = readFileSync(filePath, "utf-8");
      expect(JSON.parse(content)).toBeDefined();
    }
  });
});
