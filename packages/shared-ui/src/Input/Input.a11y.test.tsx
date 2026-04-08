// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Input } from "./index.web.js";

describe("Input axe", () => {
  it("has no a11y violations (default state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Input label="Email address" value="" onChangeText={() => undefined} />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (error state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Input
        label="Email address"
        value=""
        state="error"
        errorMessage="Please enter a valid email"
        onChangeText={() => undefined}
      />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (required)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Input label="Full name" value="" required onChangeText={() => undefined} />,
    );
    await expectNoA11yViolations(div);
  });
});
