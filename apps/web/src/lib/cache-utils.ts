import { revalidateTag } from "next/cache";

/**
 * Safely call revalidateTag, ignoring errors when called outside
 * the Next.js request/rendering context (e.g. in integration tests).
 */
export function safeRevalidateTag(tag: string, profile = "default"): void {
  try {
    revalidateTag(tag, profile);
  } catch {
    // Outside Next.js request context (e.g. integration tests) — silently skip
  }
}
