// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { Button } from "./index.web.js";

describe("Button axe", () => {
  it("has no a11y violations (primary)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Button>Join Event</Button>);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (loading state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Button loading>Saving…</Button>);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (disabled state)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Button disabled>Unavailable</Button>);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (secondary variant)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Button variant="secondary">Cancel</Button>);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (danger variant)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<Button variant="danger">Delete</Button>);
    await expectNoA11yViolations(div);
  });
});
