/**
 * WCAG 2.1 AA contrast validation for design tokens.
 * Checks foreground/background colour pairs and warns when
 * contrast ratios fail AA thresholds (4.5:1 body, 3:1 large text).
 */

/** Parse hex color to linear RGB components */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

/** sRGB to linear channel */
function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.1 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colors (always >= 1) */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Foreground/background pairs to validate */
const CONTRAST_PAIRS: Array<{
  fg: string;
  bg: string;
  label: string;
  largeText?: boolean;
}> = [
  { fg: "color.surface.foreground", bg: "color.surface.background", label: "body text on background" },
  { fg: "color.surface.muted-foreground", bg: "color.surface.background", label: "muted text on background" },
  { fg: "color.surface.card-foreground", bg: "color.surface.card", label: "card text on card" },
  { fg: "color.brand.primary", bg: "color.surface.background", label: "primary on background", largeText: true },
  { fg: "color.brand.secondary", bg: "color.surface.background", label: "secondary on background", largeText: true },
  // Dark mode pairs
  { fg: "color.dark.surface.foreground", bg: "color.dark.surface.background", label: "dark: body text on background" },
  { fg: "color.dark.surface.muted-foreground", bg: "color.dark.surface.background", label: "dark: muted text on background" },
  { fg: "color.dark.surface.card-foreground", bg: "color.dark.surface.card", label: "dark: card text on card" },
];

/** Resolve a dot-path token to its value from the SD token dictionary */
function resolveTokenValue(
  tokens: Record<string, unknown>,
  path: string,
): string | undefined {
  const parts = path.split(".");
  let current: unknown = tokens;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (current != null && typeof current === "object" && "$value" in (current as Record<string, unknown>)) {
    return (current as Record<string, string>)["$value"];
  }
  return typeof current === "string" ? current : undefined;
}

export interface WcagResult {
  pair: string;
  ratio: number;
  threshold: number;
  pass: boolean;
}

/**
 * Validate all defined contrast pairs from the token sources.
 * Returns results and logs warnings to console.
 */
export function validateContrast(
  tokenSources: Record<string, unknown>[],
): WcagResult[] {
  // Merge all token sources into one object
  const merged: Record<string, unknown> = {};
  for (const source of tokenSources) {
    Object.assign(merged, source);
  }

  const results: WcagResult[] = [];
  let hasFailure = false;

  for (const pair of CONTRAST_PAIRS) {
    const fgValue = resolveTokenValue(merged, pair.fg);
    const bgValue = resolveTokenValue(merged, pair.bg);

    if (!fgValue || !bgValue) {
      console.warn(`⚠ WCAG: Cannot resolve pair "${pair.label}" (fg=${pair.fg}, bg=${pair.bg})`);
      continue;
    }

    const ratio = contrastRatio(fgValue, bgValue);
    const threshold = pair.largeText ? 3 : 4.5;
    const pass = ratio >= threshold;

    results.push({ pair: pair.label, ratio, threshold, pass });

    if (!pass) {
      hasFailure = true;
      console.warn(
        `✗ WCAG AA FAIL: "${pair.label}" — ratio ${ratio.toFixed(2)}:1 (need ${threshold}:1) [${fgValue} on ${bgValue}]`,
      );
    }
  }

  if (!hasFailure) {
    console.log("✓ WCAG AA: All contrast pairs pass");
  }

  return results;
}
