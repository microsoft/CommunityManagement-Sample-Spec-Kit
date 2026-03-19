import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card } from "./index.web.js";

describe("Card", () => {
  it("renders children", () => {
    const html = renderToStaticMarkup(<Card>Content</Card>);
    expect(html).toContain("Content");
  });

  it("applies default variant with border", () => {
    const html = renderToStaticMarkup(<Card>Test</Card>);
    expect(html).toContain("var(--color-surface-border)");
  });

  it("applies elevated variant with shadow", () => {
    const html = renderToStaticMarkup(<Card variant="elevated">Test</Card>);
    expect(html).toContain("var(--shadow-md)");
  });

  it("applies outlined variant", () => {
    const html = renderToStaticMarkup(<Card variant="outlined">Test</Card>);
    expect(html).toContain("transparent");
  });
});
