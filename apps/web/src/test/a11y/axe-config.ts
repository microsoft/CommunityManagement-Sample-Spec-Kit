import type { RunOptions } from "axe-core";

export const axeConfig: RunOptions = {
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
  },
};

/**
 * Leaflet map container selector to exclude from axe scans.
 *
 * Leaflet is a third-party library with known accessibility limitations
 * (e.g. aria-hidden on tiles, role="presentation" on layers).
 * These violations are tracked in:
 * https://github.com/Leaflet/Leaflet/issues/7116
 *
 * Until upstream Leaflet resolves these issues we exclude the map
 * container from automated axe scans and rely on manual audits and
 * the keyboard-accessible list-view alternative.
 */
export const LEAFLET_EXCLUDE = ".leaflet-container";
