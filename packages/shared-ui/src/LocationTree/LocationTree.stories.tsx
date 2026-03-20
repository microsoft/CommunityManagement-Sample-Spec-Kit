import type { Meta, StoryObj } from "@storybook/react";
import { LocationTree } from "./index.web.js";
import type { LocationNode } from "@acroyoga/shared/types/explorer";

const mockTree: LocationNode[] = [
  {
    id: "EU",
    type: "continent",
    name: "Europe",
    slug: null,
    code: "EU",
    eventCount: 25,
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
          { id: "EU/GB/bristol", type: "city", name: "Bristol", slug: "bristol", code: "bristol", eventCount: 5, latitude: 51.45, longitude: -2.58, children: [] },
          { id: "EU/GB/london", type: "city", name: "London", slug: "london", code: "london", eventCount: 10, latitude: 51.5, longitude: -0.1, children: [] },
        ],
      },
      {
        id: "EU/DE",
        type: "country",
        name: "Germany",
        slug: null,
        code: "DE",
        eventCount: 10,
        latitude: 52.5,
        longitude: 13.4,
        children: [
          { id: "EU/DE/berlin", type: "city", name: "Berlin", slug: "berlin", code: "berlin", eventCount: 10, latitude: 52.5, longitude: 13.4, children: [] },
        ],
      },
    ],
  },
];

const meta: Meta<typeof LocationTree> = {
  title: "Components/LocationTree",
  component: LocationTree,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof LocationTree>;

export const Default: Story = {
  args: { nodes: mockTree, selectedId: null, onSelect: () => {} },
};

export const WithSelection: Story = {
  args: { nodes: mockTree, selectedId: "EU/GB/bristol", onSelect: () => {} },
};
