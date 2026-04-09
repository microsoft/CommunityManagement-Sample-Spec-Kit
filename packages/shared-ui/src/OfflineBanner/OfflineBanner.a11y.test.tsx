// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { OfflineBanner } from "./index.web.js";

describe("OfflineBanner axe", () => {
  it("has no a11y violations (visible)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<OfflineBanner visible />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (with custom message)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <OfflineBanner visible message="You are offline. Some features may be unavailable." />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (hidden)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<OfflineBanner visible={false} />);
    await expectNoA11yViolations(div);
  });
});
