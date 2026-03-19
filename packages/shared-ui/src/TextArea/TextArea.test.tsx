import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TextArea } from "./index.web.js";

describe("TextArea", () => {
  it("renders label and textarea", () => {
    const html = renderToStaticMarkup(<TextArea label="Bio" />);
    expect(html).toContain("Bio");
    expect(html).toContain("<textarea");
  });

  it("links label to textarea via htmlFor/id", () => {
    const html = renderToStaticMarkup(<TextArea label="Bio" id="my-bio" />);
    expect(html).toContain('for="my-bio"');
    expect(html).toContain('id="my-bio"');
  });

  it("renders error message with role=alert", () => {
    const html = renderToStaticMarkup(<TextArea label="Bio" state="error" errorMessage="Required" />);
    expect(html).toContain("Required");
    expect(html).toContain('role="alert"');
  });

  it("sets aria-invalid on error state", () => {
    const html = renderToStaticMarkup(<TextArea label="Bio" state="error" />);
    expect(html).toContain('aria-invalid="true"');
  });

  it("applies disabled attribute", () => {
    const html = renderToStaticMarkup(<TextArea label="Bio" disabled />);
    expect(html).toContain("disabled");
  });

  it("shows character count when maxLength set", () => {
    const html = renderToStaticMarkup(<TextArea label="Bio" maxLength={200} value="Hello" />);
    expect(html).toContain("5/200");
  });
});
