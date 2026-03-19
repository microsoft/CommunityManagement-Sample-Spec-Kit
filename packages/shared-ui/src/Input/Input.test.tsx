import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Input } from "./index.web.js";

describe("Input", () => {
  it("renders label and input", () => {
    const html = renderToStaticMarkup(<Input label="Email" />);
    expect(html).toContain("Email");
    expect(html).toContain("<input");
  });

  it("links label to input via htmlFor/id", () => {
    const html = renderToStaticMarkup(<Input label="Email" id="my-email" />);
    expect(html).toContain('for="my-email"');
    expect(html).toContain('id="my-email"');
  });

  it("renders error message with role=alert", () => {
    const html = renderToStaticMarkup(<Input label="X" state="error" errorMessage="Required" />);
    expect(html).toContain("Required");
    expect(html).toContain('role="alert"');
  });

  it("sets aria-invalid on error state", () => {
    const html = renderToStaticMarkup(<Input label="X" state="error" />);
    expect(html).toContain('aria-invalid="true"');
  });

  it("hides error message when not in error state", () => {
    const html = renderToStaticMarkup(<Input label="X" errorMessage="Msg" />);
    expect(html).not.toContain("Msg");
  });

  it("applies disabled attribute", () => {
    const html = renderToStaticMarkup(<Input label="X" disabled />);
    expect(html).toContain("disabled");
  });
});
