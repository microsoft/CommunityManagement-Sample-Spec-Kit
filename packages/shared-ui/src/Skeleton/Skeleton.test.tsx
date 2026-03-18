import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Skeleton } from "./index.web.js";

describe("Skeleton", () => {
  it("renders with aria-hidden", () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders multiple lines for text variant", () => {
    const html = renderToStaticMarkup(<Skeleton variant="text" lines={3} />);
    const spans = html.match(/<span/g);
    expect(spans?.length).toBe(3);
  });

  it("last line is shorter (75%)", () => {
    const html = renderToStaticMarkup(<Skeleton variant="text" lines={2} />);
    expect(html).toContain("75%");
  });

  it("applies circular border radius", () => {
    const html = renderToStaticMarkup(<Skeleton variant="circular" />);
    expect(html).toContain("50%");
  });

  it("includes pulse keyframe animation", () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toContain("shared-ui-pulse");
  });
});
