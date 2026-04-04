import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getEventById before importing the module under test
vi.mock("@/lib/events/service", () => ({
  getEventById: vi.fn(),
}));

import { getShareMeta } from "@/lib/events/share";
import { getEventById } from "@/lib/events/service";

const mockGetEventById = vi.mocked(getEventById);

describe("getShareMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for non-existent event", async () => {
    mockGetEventById.mockResolvedValue(null);

    const result = await getShareMeta("non-existent");

    expect(result).toBeNull();
  });

  it("generates share metadata for an event", async () => {
    mockGetEventById.mockResolvedValue({
      id: "event-1",
      title: "Morning Jam",
      description: "A fun AcroYoga jam session in the park.",
      category: "jam",
      cityName: "Bristol",
      posterImageUrl: "https://example.com/poster.jpg",
    } as ReturnType<typeof getEventById> extends Promise<infer T> ? NonNullable<T> : never);

    const result = await getShareMeta("event-1");

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Morning Jam");
    expect(result!.description).toBe("A fun AcroYoga jam session in the park.");
    expect(result!.url).toContain("/events/event-1");
    expect(result!.ogTags["og:title"]).toBe("Morning Jam");
    expect(result!.ogTags["og:type"]).toBe("website");
    expect(result!.ogTags["og:image"]).toBe("https://example.com/poster.jpg");
    expect(result!.ogTags["twitter:card"]).toBe("summary_large_image");
  });

  it("truncates description to 160 characters", async () => {
    const longDescription = "A".repeat(200);
    mockGetEventById.mockResolvedValue({
      id: "event-2",
      title: "Long Event",
      description: longDescription,
      category: "workshop",
      cityName: "London",
      posterImageUrl: null,
    } as ReturnType<typeof getEventById> extends Promise<infer T> ? NonNullable<T> : never);

    const result = await getShareMeta("event-2");

    expect(result).not.toBeNull();
    expect(result!.description.length).toBe(160);
  });

  it("uses fallback description when event has no description", async () => {
    mockGetEventById.mockResolvedValue({
      id: "event-3",
      title: "No Description Event",
      description: null,
      category: "workshop",
      cityName: "Berlin",
      posterImageUrl: null,
    } as ReturnType<typeof getEventById> extends Promise<infer T> ? NonNullable<T> : never);

    const result = await getShareMeta("event-3");

    expect(result).not.toBeNull();
    expect(result!.description).toBe("workshop event in Berlin");
  });

  it("handles empty string description with fallback", async () => {
    mockGetEventById.mockResolvedValue({
      id: "event-4",
      title: "Empty Desc Event",
      description: "",
      category: "jam",
      cityName: "Paris",
      posterImageUrl: null,
    } as ReturnType<typeof getEventById> extends Promise<infer T> ? NonNullable<T> : never);

    const result = await getShareMeta("event-4");

    expect(result).not.toBeNull();
    expect(result!.description).toBe("jam event in Paris");
  });

  it("sets empty string for og:image when no poster", async () => {
    mockGetEventById.mockResolvedValue({
      id: "event-5",
      title: "No Poster Event",
      description: "Test event",
      category: "class",
      cityName: "Lisbon",
      posterImageUrl: null,
    } as ReturnType<typeof getEventById> extends Promise<infer T> ? NonNullable<T> : never);

    const result = await getShareMeta("event-5");

    expect(result).not.toBeNull();
    expect(result!.ogTags["og:image"]).toBe("");
  });

  it("includes correct og:url with event path", async () => {
    mockGetEventById.mockResolvedValue({
      id: "abc-123",
      title: "URL Test Event",
      description: "Test",
      category: "jam",
      cityName: "Bristol",
      posterImageUrl: null,
    } as ReturnType<typeof getEventById> extends Promise<infer T> ? NonNullable<T> : never);

    const result = await getShareMeta("abc-123");

    expect(result).not.toBeNull();
    expect(result!.ogTags["og:url"]).toContain("/events/abc-123");
    expect(result!.url).toContain("/events/abc-123");
  });
});
