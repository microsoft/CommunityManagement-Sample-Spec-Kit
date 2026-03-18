import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LoadingSpinner } from "./index.web.js";

describe("LoadingSpinner", () => {
  it("renders with role=status", () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);
    expect(html).toContain('role="status"');
  });

  it("has aria-label for accessibility", () => {
    const html = renderToStaticMarkup(<LoadingSpinner label="Please wait" />);
    expect(html).toContain('aria-label="Please wait"');
  });

  it("applies size dimensions", () => {
    const html = renderToStaticMarkup(<LoadingSpinner size="lg" />);
    expect(html).toContain("40px");
  });

  it("includes spin keyframe animation", () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);
    expect(html).toContain("shared-ui-spin");
  });
});
