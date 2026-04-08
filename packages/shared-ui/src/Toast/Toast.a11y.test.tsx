// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Toast } from "./index.web.js";

describe("Toast axe", () => {
  it("has no a11y violations (info, visible)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Toast message="Event saved successfully" variant="info" visible />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (error, visible, with dismiss)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Toast message="Something went wrong" variant="error" visible onDismiss={() => undefined} />,
    );
    await expectNoA11yViolations(div);
  });

  it("renders nothing when not visible", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Toast message="Hidden" variant="info" visible={false} />,
    );
    // Empty container should have no violations
    await expectNoA11yViolations(div);
  });
});
