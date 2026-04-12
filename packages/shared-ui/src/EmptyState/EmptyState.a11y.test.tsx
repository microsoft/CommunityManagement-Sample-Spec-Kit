// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { EmptyState } from "./index.web.js";

describe("EmptyState axe", () => {
  it("has no a11y violations (title only)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<EmptyState title="No events found" />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (with description and icon)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <EmptyState
        icon="🔍"
        title="No events found"
        description="Try adjusting your filters to see more events."
      />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (with children)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <EmptyState title="No events found">
        <button type="button">Reset filters</button>
      </EmptyState>,
    );
    await expectNoA11yViolations(div);
  });
});
