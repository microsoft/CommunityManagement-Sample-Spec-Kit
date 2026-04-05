/**
 * next-intl routing configuration.
 * Spec 014 — Task T007
 *
 * Defines supported locales and the default locale.
 * Uses non-prefixed routing so existing URLs stay unchanged
 * (no /en/ prefix for the default locale).
 */
import { defineRouting } from "next-intl/routing";
import type { Locale } from "@acroyoga/shared/types/i18n";

export const routing = defineRouting({
  locales: ["en", "es", "ar"] satisfies Locale[],
  defaultLocale: "en" satisfies Locale,
});
