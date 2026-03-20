import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LocationTree } from "./index.web.js";
import type { LocationNode } from "@acroyoga/shared/types/explorer";

const mockTree: LocationNode[] = [
  {
    id: "EU",
    type: "continent",
    name: "Europe",
    slug: null,
    code: "EU",
    eventCount: 15,
    latitude: null,
    longitude: null,
    children: [
      {
        id: "EU/GB",
        type: "country",
        name: "United Kingdom",
        slug: null,
        code: "GB",
        eventCount: 15,
        latitude: 51.5,
        longitude: -0.1,
        children: [
          {
            id: "EU/GB/bristol",
            type: "city",
            name: "Bristol",
            slug: "bristol",
            code: "bristol",
            eventCount: 5,
            latitude: 51.45,
            longitude: -2.58,
            children: [],
          },
          {
            id: "EU/GB/london",
            type: "city",
            name: "London",
            slug: "london",
            code: "london",
            eventCount: 10,
            latitude: 51.5,
            longitude: -0.1,
            children: [],
          },
        ],
      },
    ],
  },
];

describe("LocationTree", () => {
  it("renders continent nodes", () => {
    const html = renderToStaticMarkup(
      <LocationTree nodes={mockTree} selectedId={null} onSelect={() => {}} />
    );
    expect(html).toContain("Europe");
  });

  it("shows event counts", () => {
    const html = renderToStaticMarkup(
      <LocationTree nodes={mockTree} selectedId={null} onSelect={() => {}} />
    );
    expect(html).toContain("15");
  });

  it("renders tree role", () => {
    const html = renderToStaticMarkup(
      <LocationTree nodes={mockTree} selectedId={null} onSelect={() => {}} />
    );
    expect(html).toContain('role="tree"');
  });

  it("renders treeitem roles", () => {
    const html = renderToStaticMarkup(
      <LocationTree nodes={mockTree} selectedId={null} onSelect={() => {}} />
    );
    expect(html).toContain('role="treeitem"');
  });

  it("marks selected node", () => {
    const html = renderToStaticMarkup(
      <LocationTree nodes={mockTree} selectedId="EU" onSelect={() => {}} />
    );
    expect(html).toContain('aria-selected="true"');
  });

  it("renders expand indicator for nodes with children", () => {
    const html = renderToStaticMarkup(
      <LocationTree nodes={mockTree} selectedId={null} onSelect={() => {}} />
    );
    expect(html).toContain("▼"); // Continent is expanded by default
  });
});
