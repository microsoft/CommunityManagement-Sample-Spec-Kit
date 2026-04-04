/**
 * next-intl request configuration.
 * Spec 014 — Task T007
 *
 * Resolves the active locale from:
 * 1. Explicit locale cookie (NEXT_LOCALE)
 * 2. Accept-Language header
 * 3. Falls back to default locale (en)
 */
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { routing } from "./routing";
import type { Locale } from "@acroyoga/shared/types/i18n";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // 1. Check explicit cookie
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;
  if (cookieLocale && routing.locales.includes(cookieLocale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Parse Accept-Language header
  const acceptLang = headerStore.get("accept-language") ?? "";
  const preferred = acceptLang
    .split(",")
    .map((entry) => {
      const [lang] = entry.trim().split(";");
      return lang.trim().split("-")[0] as Locale;
    })
    .find((code) => routing.locales.includes(code));

  const locale = preferred ?? routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
