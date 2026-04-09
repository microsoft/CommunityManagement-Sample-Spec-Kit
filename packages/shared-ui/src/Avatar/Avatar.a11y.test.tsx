// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Avatar } from "./index.web.js";

describe("Avatar axe", () => {
  it("has no a11y violations (initials)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Avatar initials="JD" alt="Jane Doe" />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (image)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Avatar src="https://example.com/avatar.jpg" alt="Jane Doe" />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (different sizes)", async () => {
    for (const size of ["sm", "md", "lg", "xl"] as const) {
      const div = document.createElement("div");
      div.innerHTML = renderToStaticMarkup(<Avatar initials="AB" alt="Alice Brown" size={size} />);
      await expectNoA11yViolations(div);
    }
  });
});
