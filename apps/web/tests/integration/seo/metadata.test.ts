import { describe, it, expect } from "vitest";
import type { EventDetail } from "@acroyoga/shared/types/events";
import { buildEventMetadata, buildTeacherMetadata } from "@/lib/seo/metadata";
import type { TeacherProfileDetail } from "@acroyoga/shared/types/teachers";

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

function makeTeacher(
  overrides: Partial<TeacherProfileDetail> = {},
): TeacherProfileDetail {
  return {
    id: "tp-001",
    user_id: "u1",
    bio: "Experienced AcroYoga teacher.",
    specialties: ["therapeutic", "performance"],
    badge_status: "verified",
    aggregate_rating: "4.8",
    review_count: 12,
    is_deleted: false,
    deleted_at: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    user_name: "Alice Smith",
    user_email: "alice@example.com",
    certifications: [],
    photos: [],
    upcoming_event_count: 3,
    past_event_count: 10,
    ...overrides,
  };
}

describe("buildEventMetadata", () => {
  it("builds og:image URL with ?v= cache-busting param for published event", () => {
    const event = makeEvent();
    const metadata = buildEventMetadata(event, "en");
    const ogImages = metadata.openGraph?.images;
    expect(ogImages).toBeDefined();
    const imageUrl = Array.isArray(ogImages) ? ogImages[0] : ogImages;
    const urlStr =
      typeof imageUrl === "object" && imageUrl !== null && "url" in imageUrl
        ? (imageUrl as { url: string }).url
        : String(imageUrl);
    expect(urlStr).toContain(`/api/og/events/${event.id}`);
    expect(urlStr).toContain("v=");
  });

  it("returns robots noindex for draft event", () => {
    const event = makeEvent({ status: "draft" });
    const metadata = buildEventMetadata(event, "en");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("returns robots index for published event", () => {
    const event = makeEvent({ status: "published" });
    const metadata = buildEventMetadata(event, "en");
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("truncates description to 160 chars", () => {
    const event = makeEvent({ description: "A".repeat(200) });
    const metadata = buildEventMetadata(event, "en");
    expect((metadata.description ?? "").length).toBeLessThanOrEqual(160);
  });

  it("uses fallback description when no event description", () => {
    const event = makeEvent({ description: null });
    const metadata = buildEventMetadata(event, "en");
    expect(metadata.description).toContain(event.cityName);
  });
});

describe("buildTeacherMetadata", () => {
  it("uses fallback description when teacher has no bio", () => {
    const profile = makeTeacher({ bio: null });
    const metadata = buildTeacherMetadata(profile, "en");
    expect(metadata.description).toBeTruthy();
  });

  it("sets twitterCard to summary for teacher", () => {
    const profile = makeTeacher();
    const metadata = buildTeacherMetadata(profile, "en");
    // Twitter card type is nested under twitter object
    expect(metadata.twitter).toBeDefined();
    const twitterCard = (metadata.twitter as Record<string, unknown>)?.card;
    expect(twitterCard).toBe("summary");
  });

  it("returns robots noindex for deleted teacher", () => {
    const profile = makeTeacher({ is_deleted: true });
    const metadata = buildTeacherMetadata(profile, "en");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("includes og:image URL with ?v= param when photos present", () => {
    const profile = makeTeacher({
      photos: [{ id: "p1", teacher_profile_id: "tp-001", url: "https://example.com/avatar.jpg", sort_order: 0, created_at: "2026-01-01" }],
    });
    const metadata = buildTeacherMetadata(profile, "en");
    const ogImages = metadata.openGraph?.images;
    const imageUrl = Array.isArray(ogImages) ? ogImages[0] : ogImages;
    const urlStr =
      typeof imageUrl === "object" && imageUrl !== null && "url" in imageUrl
        ? (imageUrl as { url: string }).url
        : String(imageUrl);
    expect(urlStr).toContain(`/api/og/teachers/${profile.id}`);
    expect(urlStr).toContain("v=");
  });
});
