// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { TextArea } from "./index.web.js";

describe("TextArea axe", () => {
  it("has no a11y violations (default state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <TextArea label="Bio" value="" onChangeText={() => undefined} />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (error state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <TextArea
        label="Bio"
        value=""
        state="error"
        errorMessage="Bio cannot be empty"
        onChangeText={() => undefined}
      />,
    );
    await expectNoA11yViolations(div);
  });
});
