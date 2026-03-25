/**
 * Callback URL validation utility
 * Spec: 011-entra-external-id (T015)
 *
 * Validates that a callbackUrl is same-origin to prevent open redirect attacks.
 * Returns the validated URL or "/" as a safe fallback.
 */

/**
 * Validate that a callbackUrl is safe (same-origin or relative path).
 *
 * @param callbackUrl  The URL to validate (from search params, may be null/undefined).
 * @param baseUrl      The application base URL for origin comparison (e.g. process.env.NEXTAUTH_URL).
 * @returns            The validated URL if safe, or "/" as fallback.
 */
export function validateCallbackUrl(
  callbackUrl: string | null | undefined,
  baseUrl: string,
): string {
  if (!callbackUrl) {
    return "/";
  }

  // Protocol-relative URLs (//evil.com) are unsafe — reject them
  if (callbackUrl.startsWith("//")) {
    return "/";
  }

  // Relative paths starting with / are always safe
  if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  // Absolute URLs: check they are same-origin
  try {
    const base = new URL(baseUrl);
    const target = new URL(callbackUrl);
    if (target.origin === base.origin) {
      return callbackUrl;
    }
  } catch {
    // URL parse failure — not a valid absolute URL; reject it
  }

  return "/";
}
