// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Skeleton } from "./index.web.js";

describe("Skeleton axe", () => {
  it("has no a11y violations (text variant)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Skeleton variant="text" />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (circular variant)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Skeleton variant="circular" width={48} height={48} />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (rectangular variant)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Skeleton variant="rectangular" width="100%" height={200} />);
    await expectNoA11yViolations(div);
  });
});
