/**
 * Escape special characters in user input for use in ILIKE patterns.
 * Prevents `%`, `_`, and `\` from being interpreted as wildcards.
 */
export function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&");
}
