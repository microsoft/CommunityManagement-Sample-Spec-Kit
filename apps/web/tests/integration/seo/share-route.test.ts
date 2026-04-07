import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventDetail } from "@acroyoga/shared/types/events";

function makeEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: "evt-001",
    title: "Morning AcroYoga Flow",
    startDatetime: "2026-06-01T09:00:00Z",
    endDatetime: "2026-06-01T11:00:00Z",
    venueName: "Yoga Studio",
    cityName: "London",
    citySlug: "london",
    category: "workshop",
    skillLevel: "beginner",
    cost: 15,
    currency: "GBP",
    capacity: 20,
    confirmedCount: 5,
    interestedCount: 10,
    posterImageUrl: "https://example.com/poster.jpg",
    isExternal: false,
    description: "A relaxed morning flow.",
    prerequisites: null,
    concessionCost: null,
    refundWindowHours: 24,
    waitlistCutoffHours: 2,
    externalUrl: null,
    recurrenceRule: null,
    status: "published",
    venue: {
      id: "v1",
      name: "Yoga Studio",
      address: "1 Main St, London EC1A 1BB",
      cityId: "city-1",
      cityName: "London",
      latitude: 51.5,
      longitude: -0.1,
      mapLinks: { google: "", apple: "", osm: "", what3words: "" },
    },
    roleBreakdown: { base: 5, flyer: 5, hybrid: 5, hint: "base" },
    attendees: [],
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

// Mock getEventById at module level
const mockGetEventById = vi.fn<(id: string) => Promise<EventDetail | null>>();
vi.mock("@/lib/events/service", () => ({
  getEventById: (...args: unknown[]) => mockGetEventById(args[0] as string),
}));

const { getShareMeta } = await import("@/lib/events/share");

describe("share route and getShareMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for non-existent event", async () => {
    mockGetEventById.mockResolvedValue(null);
    const result = await getShareMeta("missing");
    expect(result).toBeNull();
  });

  it("includes updatedAt in response", async () => {
    mockGetEventById.mockResolvedValue(makeEvent());
    const result = await getShareMeta("evt-001", "en");
    expect(result).not.toBeNull();
    expect(result!.updatedAt).toBe("2026-05-01T00:00:00Z");
  });

  it("includes locale in response", async () => {
    mockGetEventById.mockResolvedValue(makeEvent());
    const result = await getShareMeta("evt-001", "es");
    expect(result!.locale).toBe("es");
  });

  it("includes og:tags in response", async () => {
    mockGetEventById.mockResolvedValue(makeEvent());
    const result = await getShareMeta("evt-001");
    expect(result!.ogTags["og:title"]).toBe("Morning AcroYoga Flow");
    expect(result!.ogTags["og:type"]).toBe("website");
    expect(result!.ogTags["twitter:card"]).toBe("summary_large_image");
  });

  it("truncates description to 160 chars", async () => {
    mockGetEventById.mockResolvedValue(
      makeEvent({ description: "A".repeat(200) }),
    );
    const result = await getShareMeta("evt-001");
    expect(result!.description.length).toBeLessThanOrEqual(160);
  });

  it("uses fallback description when event has no description", async () => {
    mockGetEventById.mockResolvedValue(
      makeEvent({ description: null }),
    );
    const result = await getShareMeta("evt-001");
    expect(result!.description).toContain("London");
  });
});
