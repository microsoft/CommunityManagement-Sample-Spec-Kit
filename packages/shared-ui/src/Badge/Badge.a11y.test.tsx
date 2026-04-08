// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Badge } from "./index.web.js";

describe("Badge axe", () => {
  it("has no a11y violations (default)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Badge label="New" />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (success)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Badge label="Verified" variant="success" />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (warning)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Badge label="Pending" variant="warning" />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (error)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Badge label="Revoked" variant="error" />);
    await expectNoA11yViolations(div);
  });
});
