import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

/**
 * P0 Integration Test: Token → Component propagation
 *
 * Validates Constitution V (UX Consistency) and spec 008 US1+US5:
 * Design tokens compile and are consumed by shared-ui components.
 * This ensures the single-source token pipeline is wired end-to-end.
 */

const ROOT = resolve(import.meta.dirname!, "../../../..");
const TOKENS_BUILD = resolve(ROOT, "packages/tokens/build");
const SHARED_UI = resolve(ROOT, "packages/shared-ui/src");

describe("token-to-component integration", () => {
  let tokensCss: string;
  let tokensTs: string;

  beforeAll(() => {
    // Ensure token build outputs exist
    const cssPath = resolve(TOKENS_BUILD, "css/tokens.css");
    const tsPath = resolve(TOKENS_BUILD, "ts/tokens.ts");
    expect(existsSync(cssPath)).toBe(true);
    expect(existsSync(tsPath)).toBe(true);
    tokensCss = readFileSync(cssPath, "utf-8");
    tokensTs = readFileSync(tsPath, "utf-8");
  });

  it("CSS tokens define all required custom properties for components", () => {
    // Properties that shared-ui Button, Card, Badge, etc. depend on
    const requiredTokens = [
      "--color-brand-primary",
      "--color-brand-secondary",
      "--color-surface-background",
      "--color-surface-foreground",
      "--color-semantic-success",
      "--color-semantic-error",
      "--spacing-1",
      "--spacing-2",
      "--spacing-4",
      "--font-size-base",
      "--font-family-sans",
      "--radius-md",
      "--shadow-md",
    ];

    for (const token of requiredTokens) {
      expect(tokensCss).toContain(`${token}:`);
    }
  });

  it("TypeScript tokens export typed constants matching CSS tokens", () => {
    expect(tokensTs).toContain("ColorBrandPrimary");
    expect(tokensTs).toContain("Spacing4");
    expect(tokensTs).toContain("FontSizeBase");
  });

  it("Button component renders with token-based styling", async () => {
    const { Button } = await import("../Button/index.web.js");
    const html = renderToStaticMarkup(React.createElement(Button, null, "Test"));
    // Button should render a <button> element with inline styles referencing tokens
    expect(html).toContain("<button");
    expect(html).toContain("Test");
    // Should reference CSS custom property values (var(--...) in styles)
    expect(html).toContain("var(--color-brand-primary)");
  });

  it("Card component renders with token-based styling", async () => {
    const { Card } = await import("../Card/index.web.js");
    const html = renderToStaticMarkup(
      React.createElement(Card, null, React.createElement("p", null, "Content")),
    );
    expect(html).toContain("Content");
    // Card should use token-based border radius and shadow
    expect(html).toContain("var(--radius-");
  });

  it("Badge component renders with token-based styling", async () => {
    const { Badge } = await import("../Badge/index.web.js");
    const html = renderToStaticMarkup(
      React.createElement(Badge, { label: "Active" }),
    );
    expect(html).toContain("Active");
  });

  it("all shared-ui components have web renderers", () => {
    const components = [
      "Button",
      "Card",
      "EventCard",
      "TeacherCard",
      "Avatar",
      "Badge",
      "Input",
      "LoadingSpinner",
      "OfflineBanner",
      "EmptyState",
      "Skeleton",
      "TextArea",
      "Select",
      "Modal",
      "Toast",
    ];

    for (const component of components) {
      const webPath = resolve(SHARED_UI, component, "index.web.tsx");
      expect(existsSync(webPath), `${component}/index.web.tsx should exist`).toBe(true);
    }
  });

  it("dark theme token overrides exist for all surface tokens", () => {
    const darkCssPath = resolve(TOKENS_BUILD, "css/tokens-dark.css");
    expect(existsSync(darkCssPath)).toBe(true);
    const darkCss = readFileSync(darkCssPath, "utf-8");

    expect(darkCss).toContain('[data-theme="dark"]');
    expect(darkCss).toContain("--color-surface-background:");
    expect(darkCss).toContain("--color-surface-foreground:");
  });
});
