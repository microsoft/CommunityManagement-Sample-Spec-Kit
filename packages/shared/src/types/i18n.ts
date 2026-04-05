/**
 * Shared i18n types for locale-aware rendering.
 * Spec 014 — Internationalisation
 */

/** Supported locale codes (BCP 47) */
export type Locale = "en" | "es" | "ar";

/** Text direction for the active locale */
export type Direction = "ltr" | "rtl";

/** Translation file namespace hierarchy keys */
export type TranslationNamespace =
  | "common"
  | "events"
  | "community"
  | "permissions"
  | "teachers"
  | "payments"
  | "directory"
  | "explorer"
  | "auth"
  | "errors";

/** Locale metadata used by the layout and locale switcher */
export interface SupportedLocale {
  code: Locale;
  name: string;
  nativeName: string;
  direction: Direction;
}

/** Registry of all supported locales with metadata */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl" },
] as const;

export const DEFAULT_LOCALE: Locale = "en";

/** Lookup direction for a given locale code */
export function getLocaleDirection(locale: Locale): Direction {
  const entry = SUPPORTED_LOCALES.find((l) => l.code === locale);
  return entry?.direction ?? "ltr";
}
