import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "./index.web.js";

describe("Avatar", () => {
  it("renders image when src provided", () => {
    const html = renderToStaticMarkup(<Avatar src="/photo.jpg" alt="Photo" />);
    expect(html).toContain('<img');
    expect(html).toContain('src="/photo.jpg"');
  });

  it("renders initials when no src", () => {
    const html = renderToStaticMarkup(<Avatar initials="er" />);
    expect(html).toContain("ER");
  });

  it("truncates initials to 2 characters", () => {
    const html = renderToStaticMarkup(<Avatar initials="abc" />);
    expect(html).toContain("AB");
    expect(html).not.toContain("C");
  });

  it("applies size dimensions", () => {
    const html = renderToStaticMarkup(<Avatar initials="XL" size="xl" />);
    expect(html).toContain("80px");
  });

  it("has role=img for accessibility", () => {
    const html = renderToStaticMarkup(<Avatar initials="A" />);
    expect(html).toContain('role="img"');
  });
});
