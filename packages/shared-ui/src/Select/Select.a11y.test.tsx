// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Select } from "./index.web.js";

const OPTIONS = [
  { value: "base", label: "Base" },
  { value: "flyer", label: "Flyer" },
  { value: "hybrid", label: "Hybrid" },
];

describe("Select axe", () => {
  it("has no a11y violations (default state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Select label="Role" options={OPTIONS} value="" />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (error state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Select
        label="Role"
        options={OPTIONS}
        value=""
        state="error"
        errorMessage="Please select a role"
      />,
    );
    await expectNoA11yViolations(div);
  });
});
