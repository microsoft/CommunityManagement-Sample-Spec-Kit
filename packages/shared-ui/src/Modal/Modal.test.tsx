import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Modal } from "./index.web.js";

describe("Modal", () => {
  it("renders dialog element with title", () => {
    const html = renderToStaticMarkup(
      <Modal open={true} title="Confirm RSVP" onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    );
    expect(html).toContain("<dialog");
    expect(html).toContain("Confirm RSVP");
  });

  it("renders children content", () => {
    const html = renderToStaticMarkup(
      <Modal open={true} title="Test" onClose={() => {}}>
        <p>Hello world</p>
      </Modal>,
    );
    expect(html).toContain("Hello world");
  });

  it("includes close button with aria-label", () => {
    const html = renderToStaticMarkup(
      <Modal open={true} title="Test" onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    );
    expect(html).toContain('aria-label="Close modal"');
  });

  it("sets aria-labelledby on dialog", () => {
    const html = renderToStaticMarkup(
      <Modal open={true} title="Test" onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    );
    expect(html).toContain('aria-labelledby="modal-title"');
    expect(html).toContain('id="modal-title"');
  });
});
