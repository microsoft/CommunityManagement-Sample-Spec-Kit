// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Card } from "./index.web.js";

describe("Card axe", () => {
  it("has no a11y violations (default)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Card>
        <p>Card content</p>
      </Card>,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (elevated)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Card variant="elevated">
        <p>Elevated card</p>
      </Card>,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (outlined)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <Card variant="outlined">
        <h2>Title</h2>
        <p>Outlined card</p>
      </Card>,
    );
    await expectNoA11yViolations(div);
  });
});
