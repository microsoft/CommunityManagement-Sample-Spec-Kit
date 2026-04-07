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

// Mock getEventById at the module level
const mockGetEventById = vi.fn<(id: string) => Promise<EventDetail | null>>();
vi.mock("@/lib/events/service", () => ({
  getEventById: (...args: unknown[]) => mockGetEventById(args[0] as string),
}));

// Dynamic import after mocking
const { GET } = await import("@/app/api/og/events/[id]/route");

describe("OG events image route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-existent event", async () => {
    mockGetEventById.mockResolvedValue(null);
    const req = new Request("http://localhost/api/og/events/missing");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for draft event", async () => {
    mockGetEventById.mockResolvedValue(makeEvent({ status: "draft" }));
    const req = new Request("http://localhost/api/og/events/evt-001");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "evt-001" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with image content-type for published event", async () => {
    mockGetEventById.mockResolvedValue(makeEvent({ status: "published" }));
    const req = new Request("http://localhost/api/og/events/evt-001");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "evt-001" }),
    });
    expect(res.status).toBe(200);
    const ct = res.headers.get("content-type");
    expect(ct).toContain("image/png");
  });

  it("sets Cache-Control header", async () => {
    mockGetEventById.mockResolvedValue(makeEvent({ status: "published" }));
    const req = new Request("http://localhost/api/og/events/evt-001");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "evt-001" }),
    });
    const cc = res.headers.get("cache-control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=86400");
  });
});
