import { BASE_URL } from "@/lib/config";
import type { HreflangLocale } from "@acroyoga/shared/types/seo";

export function buildCanonicalUrl(path: string): string {
  // Strip locale prefix if present (/en/, /es/, /ar/)
  const clean = path.replace(/^\/(en|es|ar)(?=\/|$)/, "");
  return `${BASE_URL}${clean}`;
}

export function buildAlternateLanguages(
  path: string,
): Record<HreflangLocale, string> {
  const canonical = buildCanonicalUrl(path);
  return {
    en: canonical,
    es: canonical,
    ar: canonical,
    "x-default": canonical,
  };
}
