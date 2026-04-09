// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { SkipLink } from "./index.web.js";

describe("SkipLink axe", () => {
  it("has no a11y violations", async () => {
    const div = document.createElement("div");
    const { renderToStaticMarkup } = await import("react-dom/server");
    div.innerHTML = renderToStaticMarkup(
      <SkipLink targetId="main-content" label="Skip to main content" />,
    );
    await expectNoA11yViolations(div);
  });
});
