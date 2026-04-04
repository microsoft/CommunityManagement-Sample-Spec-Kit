/**
 * Platform-agnostic Intl formatting helpers.
 * Spec 014 — Internationalisation (T005)
 *
 * These wrap the standard `Intl` API so every UI surface uses consistent,
 * locale-aware formatting for dates, numbers, and currency.
 */

/**
 * Format an event date/time for display.
 *
 * @param iso      ISO 8601 date string
 * @param locale   BCP 47 locale code (default: "en")
 * @param timeZone IANA time zone (default: browser/runtime default)
 * @param options  Additional Intl.DateTimeFormat options to merge
 */
export function formatEventDate(
  iso: string,
  locale = "en",
  timeZone?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const defaults: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
    ...options,
  };
  return new Intl.DateTimeFormat(locale, defaults).format(d);
}

/**
 * Format a currency amount.
 *
 * @param amount   Numeric value
 * @param currency ISO 4217 currency code (e.g. "USD", "EUR", "JPY")
 * @param locale   BCP 47 locale code (default: "en")
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en",
): string {
  // Validate ISO 4217 — must be exactly 3 uppercase letters
  if (!/^[A-Z]{3}$/.test(currency)) {
    return `${amount} ${currency}`;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

type RelativeTimeUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

/**
 * Format a relative time description (e.g. "3 days ago", "in 2 hours").
 *
 * @param value  Signed integer (negative = past, positive = future)
 * @param unit   Intl.RelativeTimeFormat unit
 * @param locale BCP 47 locale code (default: "en")
 */
export function formatRelativeTime(
  value: number,
  unit: RelativeTimeUnit,
  locale = "en",
): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    value,
    unit,
  );
}

/**
 * Format a plain number with locale-aware grouping/decimals.
 *
 * @param value   Numeric value
 * @param locale  BCP 47 locale code (default: "en")
 * @param options Additional Intl.NumberFormat options
 */
export function formatNumber(
  value: number,
  locale = "en",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}
