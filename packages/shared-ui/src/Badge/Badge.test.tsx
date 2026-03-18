import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge } from "./index.web.js";

describe("Badge", () => {
  it("renders label text", () => {
    const html = renderToStaticMarkup(<Badge label="Active" />);
    expect(html).toContain("Active");
  });

  it("renders as a span", () => {
    const html = renderToStaticMarkup(<Badge label="Tag" />);
    expect(html).toMatch(/^<span/);
  });

  it("applies success variant styles", () => {
    const html = renderToStaticMarkup(<Badge label="OK" variant="success" />);
    expect(html).toContain("color-feedback-success");
  });

  it("applies error variant styles", () => {
    const html = renderToStaticMarkup(<Badge label="Fail" variant="error" />);
    expect(html).toContain("color-feedback-error");
  });
});
