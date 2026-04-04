"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES } from "@acroyoga/shared/types/i18n";
import type { Locale } from "@acroyoga/shared/types/i18n";

/**
 * Locale switcher dropdown.
 * Spec 014 — Task T031
 *
 * Sets NEXT_LOCALE cookie and refreshes the page so the server
 * re-renders with the new locale. Accessible via keyboard.
 */
export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLocale = e.target.value as Locale;
    if (newLocale === currentLocale) return;

    // Persist locale in a cookie so next-intl's request.ts picks it up on SSR
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;

    // Refresh the page to trigger server-side re-render with new locale
    router.refresh();
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      aria-label="Select language"
      className="text-sm bg-transparent border border-border rounded-md px-2 py-1 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.nativeName}
        </option>
      ))}
    </select>
  );
}
