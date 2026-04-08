// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Modal } from "./index.web.js";

describe("Modal axe", () => {
  it("has aria-modal='true' attribute", () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Modal open title="Share Event" onClose={() => undefined}>
        <p>Modal content</p>
      </Modal>,
    );
    const dialog = div.querySelector("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
  });

  it("has no a11y violations (open)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Modal open title="Share Event" onClose={() => undefined}>
        <button type="button">Close</button>
      </Modal>,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (closed)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Modal open={false} title="Share Event" onClose={() => undefined}>
        <button type="button">Close</button>
      </Modal>,
    );
    await expectNoA11yViolations(div);
  });
});
