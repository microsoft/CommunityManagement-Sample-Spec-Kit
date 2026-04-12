// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { LocationTree } from "./index.web.js";
import type { LocationNode } from "@acroyoga/shared/types/explorer";

const mockNodes: LocationNode[] = [
  {
    id: "europe",
    type: "continent",
    name: "Europe",
    slug: "europe",
    code: "EU",
    eventCount: 42,
    latitude: 54,
    longitude: 15,
    children: [
      {
        id: "europe/uk",
        type: "country",
        name: "United Kingdom",
        slug: "uk",
        code: "GB",
        eventCount: 15,
        latitude: 55,
        longitude: -3,
        children: [
          {
            id: "europe/uk/london",
            type: "city",
            name: "London",
            slug: "london",
            code: "LON",
            eventCount: 8,
            latitude: 51.5,
            longitude: -0.1,
            children: [],
          },
        ],
      },
    ],
  },
];

describe("LocationTree axe", () => {
  it("has no a11y violations (no selection)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <LocationTree nodes={mockNodes} selectedId={null} onSelect={() => undefined} />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (with selection)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <LocationTree nodes={mockNodes} selectedId="europe/uk" onSelect={() => undefined} />,
    );
    await expectNoA11yViolations(div);
  });
});
