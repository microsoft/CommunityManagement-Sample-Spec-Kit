import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./index.web.js";

describe("Button", () => {
  it("renders with children", () => {
    const html = renderToStaticMarkup(<Button>Click me</Button>);
    expect(html).toContain("Click me");
  });

  it("renders as disabled when disabled prop is true", () => {
    const html = renderToStaticMarkup(<Button disabled>No click</Button>);
    expect(html).toContain("disabled");
    expect(html).toContain("not-allowed");
  });

  it("renders as disabled when loading", () => {
    const html = renderToStaticMarkup(<Button loading>Saving</Button>);
    expect(html).toContain("disabled");
  });

  it("shows spinner when loading", () => {
    const html = renderToStaticMarkup(<Button loading>Saving</Button>);
    expect(html).toContain("spin");
  });

  it("applies primary variant styles by default", () => {
    const html = renderToStaticMarkup(<Button>Test</Button>);
    expect(html).toContain("var(--color-brand-primary)");
  });

  it("applies danger variant styles", () => {
    const html = renderToStaticMarkup(<Button variant="danger">Delete</Button>);
    expect(html).toContain("var(--color-semantic-error)");
  });

  it("applies size styles", () => {
    const sm = renderToStaticMarkup(<Button size="sm">S</Button>);
    const lg = renderToStaticMarkup(<Button size="lg">L</Button>);
    expect(sm).toContain("var(--font-size-sm)");
    expect(lg).toContain("var(--font-size-lg)");
  });

  it("renders button type=button", () => {
    const html = renderToStaticMarkup(<Button>Test</Button>);
    expect(html).toContain('type="button"');
  });
});
