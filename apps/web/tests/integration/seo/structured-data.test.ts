import { describe, it, expect } from "vitest";
import type { EventDetail } from "@acroyoga/shared/types/events";
import {
  buildEventJsonLd,
  buildTeacherJsonLd,
} from "@/lib/seo/structured-data";
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
    posterImageUrl: null,
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
    specialties: ["therapeutic"],
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

describe("buildEventJsonLd", () => {
  it("returns null for draft event", () => {
    expect(buildEventJsonLd(makeEvent({ status: "draft" }))).toBeNull();
  });

  it("returns EventScheduled for published event", () => {
    const ld = buildEventJsonLd(makeEvent({ status: "published" }));
    expect(ld?.eventStatus).toBe("https://schema.org/EventScheduled");
  });

  it("returns EventCancelled for cancelled event", () => {
    const ld = buildEventJsonLd(makeEvent({ status: "cancelled" }));
    expect(ld?.eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("includes all required Schema.org fields", () => {
    const event = makeEvent();
    const ld = buildEventJsonLd(event);
    expect(ld?.["@context"]).toBe("https://schema.org");
    expect(ld?.["@type"]).toBe("Event");
    expect(ld?.name).toBe(event.title);
    expect(ld?.location["@type"]).toBe("Place");
    expect(ld?.offers["@type"]).toBe("Offer");
    expect(ld?.offers.price).toBe(event.cost);
  });

  it("sets SoldOut when confirmedCount >= capacity", () => {
    const ld = buildEventJsonLd(makeEvent({ confirmedCount: 20, capacity: 20 }));
    expect(ld?.offers.availability).toBe("https://schema.org/SoldOut");
  });
});

describe("buildTeacherJsonLd", () => {
  it("returns null for deleted teacher", () => {
    expect(buildTeacherJsonLd(makeTeacher({ is_deleted: true }))).toBeNull();
  });

  it("builds Person schema with correct fields", () => {
    const profile = makeTeacher();
    const ld = buildTeacherJsonLd(profile);
    expect(ld?.["@context"]).toBe("https://schema.org");
    expect(ld?.["@type"]).toBe("Person");
    expect(ld?.name).toBe(profile.user_name);
    expect(ld?.jobTitle).toBe("AcroYoga Teacher");
    expect(ld?.knowsAbout).toEqual(profile.specialties);
  });
});
