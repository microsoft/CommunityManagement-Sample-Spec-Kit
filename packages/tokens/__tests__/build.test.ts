import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { contrastRatio, validateContrast } from "../transforms/wcag-contrast.ts";

const TOKENS_DIR = resolve(import.meta.dirname!, "..");
const BUILD_DIR = resolve(TOKENS_DIR, "build");

beforeAll(() => {
  // Ensure tokens are built before tests run
  execSync("node --import tsx build.ts", {
    cwd: TOKENS_DIR,
    stdio: "pipe",
  });
});

describe("token pipeline build outputs", () => {
  it("generates CSS token file", () => {
    expect(existsSync(resolve(BUILD_DIR, "css/tokens.css"))).toBe(true);
  });

  it("generates dark theme CSS file", () => {
    expect(existsSync(resolve(BUILD_DIR, "css/tokens-dark.css"))).toBe(true);
  });

  it("generates TypeScript token file", () => {
    expect(existsSync(resolve(BUILD_DIR, "ts/tokens.ts"))).toBe(true);
  });

  it("generates Tailwind token file", () => {
    expect(existsSync(resolve(BUILD_DIR, "tailwind/tokens.ts"))).toBe(true);
  });

  it("generates Swift token file", () => {
    expect(existsSync(resolve(BUILD_DIR, "swift/DesignTokens.swift"))).toBe(true);
  });

  it("generates Kotlin token file", () => {
    expect(existsSync(resolve(BUILD_DIR, "kotlin/DesignTokens.kt"))).toBe(true);
  });
});

describe("CSS output content", () => {
  let css: string;
  let darkCss: string;

  beforeAll(() => {
    css = readFileSync(resolve(BUILD_DIR, "css/tokens.css"), "utf-8");
    darkCss = readFileSync(resolve(BUILD_DIR, "css/tokens-dark.css"), "utf-8");
  });

  it("contains color custom properties", () => {
    expect(css).toContain("--color-brand-primary:");
    expect(css).toContain("--color-semantic-success:");
    expect(css).toContain("--color-surface-background:");
  });

  it("contains spacing custom properties", () => {
    expect(css).toContain("--spacing-4:");
  });

  it("contains typography custom properties", () => {
    expect(css).toContain("--font-size-base:");
    expect(css).toContain("--font-family-sans:");
  });

  it("contains shadow custom properties", () => {
    expect(css).toContain("--shadow-md:");
  });

  it("contains radius custom properties", () => {
    expect(css).toContain("--radius-md:");
  });

  it("contains global token custom properties", () => {
    expect(css).toContain("--global-focus-ring:");
    expect(css).toContain("--global-breakpoint-md:");
  });

  it("resolves token references in CSS output", () => {
    expect(css).toContain("var(--color-brand-primary)");
  });

  it("dark theme uses [data-theme='dark'] selector", () => {
    expect(darkCss).toContain('[data-theme="dark"]');
  });

  it("dark theme overrides surface variables", () => {
    expect(darkCss).toContain("--color-surface-background:");
    expect(darkCss).toContain("--color-surface-foreground:");
    // Should NOT contain "dark" in variable names
    expect(darkCss).not.toContain("--color-dark-");
  });
});

describe("WCAG contrast validation", () => {
  it("calculates correct contrast ratio for black on white", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("calculates correct contrast ratio for identical colors", () => {
    const ratio = contrastRatio("#6366F1", "#6366F1");
    expect(ratio).toBeCloseTo(1, 1);
  });

  it("detects low-contrast pairs", () => {
    // Light gray on white should fail
    const ratio = contrastRatio("#CCCCCC", "#FFFFFF");
    expect(ratio).toBeLessThan(4.5);
  });

  it("validates all token contrast pairs pass", () => {
    const colorTokens = JSON.parse(
      readFileSync(resolve(import.meta.dirname!, "..", "src/color.tokens.json"), "utf-8"),
    );
    const results = validateContrast([colorTokens]);
    const failures = results.filter((r) => !r.pass);
    expect(failures).toEqual([]);
  });

  it("warns for a deliberately low-contrast pair", () => {
    // Use tokens with low contrast
    const lowContrastTokens = {
      color: {
        surface: {
          foreground: { "$value": "#CCCCCC", "$type": "color" },
          background: { "$value": "#FFFFFF", "$type": "color" },
          "muted-foreground": { "$value": "#EEEEEE", "$type": "color" },
          card: { "$value": "#FFFFFF", "$type": "color" },
          "card-foreground": { "$value": "#DDDDDD", "$type": "color" },
        },
        brand: {
          primary: { "$value": "#FFFFFF", "$type": "color" },
          secondary: { "$value": "#FFFFFF", "$type": "color" },
        },
        dark: {
          surface: {
            foreground: { "$value": "#333333", "$type": "color" },
            background: { "$value": "#222222", "$type": "color" },
            "muted-foreground": { "$value": "#333333", "$type": "color" },
            card: { "$value": "#222222", "$type": "color" },
            "card-foreground": { "$value": "#333333", "$type": "color" },
          },
        },
      },
    };
    const results = validateContrast([lowContrastTokens]);
    const failures = results.filter((r) => !r.pass);
    expect(failures.length).toBeGreaterThan(0);
  });
});
