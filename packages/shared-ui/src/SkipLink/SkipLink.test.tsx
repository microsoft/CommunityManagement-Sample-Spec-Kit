import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SkipLink } from "./index.web.js";

describe("SkipLink", () => {
  it("renders an anchor pointing to the target id", () => {
    const html = renderToStaticMarkup(<SkipLink targetId="main-content" label="Skip to main content" />);
    expect(html).toContain('href="#main-content"');
  });

  it("renders the label text", () => {
    const html = renderToStaticMarkup(<SkipLink targetId="main-content" label="Skip to main content" />);
    expect(html).toContain("Skip to main content");
  });

  it("applies the skip-link class for CSS visibility control", () => {
    const html = renderToStaticMarkup(<SkipLink targetId="main-content" label="Skip to main content" />);
    expect(html).toContain('class="skip-link"');
  });
});
