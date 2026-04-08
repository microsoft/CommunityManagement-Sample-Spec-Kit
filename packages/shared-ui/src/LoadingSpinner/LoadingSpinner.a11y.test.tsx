// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { LoadingSpinner } from "./index.web.js";

describe("LoadingSpinner axe", () => {
  it("has no a11y violations (default)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<LoadingSpinner />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (with label)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<LoadingSpinner label="Loading events…" size="lg" />);
    await expectNoA11yViolations(div);
  });
});
