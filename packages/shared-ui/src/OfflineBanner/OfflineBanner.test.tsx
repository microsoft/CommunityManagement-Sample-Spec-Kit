import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OfflineBanner } from "./index.web.js";

describe("OfflineBanner", () => {
  it("renders default message", () => {
    const html = renderToStaticMarkup(<OfflineBanner />);
    expect(html).toContain("You are offline");
  });

  it("renders custom message", () => {
    const html = renderToStaticMarkup(<OfflineBanner message="No connection" />);
    expect(html).toContain("No connection");
  });

  it("has role=alert for accessibility", () => {
    const html = renderToStaticMarkup(<OfflineBanner />);
    expect(html).toContain('role="alert"');
  });

  it("renders nothing when visible=false", () => {
    const html = renderToStaticMarkup(<OfflineBanner visible={false} />);
    expect(html).toBe("");
  });
});
