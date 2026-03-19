import type { Meta, StoryObj } from "@storybook/react";
import { EventCard } from "./index.web.js";
import type { EventCardData } from "./EventCard.js";

const sampleEvent: EventCardData = {
  id: "evt-1",
  title: "Saturday Morning Jam",
  startDatetime: "2026-04-05T10:00:00Z",
  venueName: "Movement Lab",
  cityName: "Portland",
  category: "jam",
  skillLevel: "all_levels",
  cost: 0,
  currency: "USD",
  confirmedCount: 18,
  capacity: 30,
  posterImageUrl: null,
  userRsvpStatus: null,
};

const meta: Meta<typeof EventCard> = {
  title: "Components/EventCard",
  component: EventCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof EventCard>;

export const Free: Story = {
  args: { event: sampleEvent },
};

export const Paid: Story = {
  args: {
    event: { ...sampleEvent, cost: 25, title: "Partner Acro Workshop", category: "workshop", skillLevel: "intermediate" },
  },
};

export const WithRsvp: Story = {
  args: {
    event: { ...sampleEvent, userRsvpStatus: "confirmed" },
  },
};

export const AlmostFull: Story = {
  args: {
    event: { ...sampleEvent, confirmedCount: 28, capacity: 30, title: "Festival Intensive" },
  },
};
