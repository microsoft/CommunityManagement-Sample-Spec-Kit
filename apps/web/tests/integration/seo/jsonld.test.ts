import { describe, it, expect } from "vitest";
import type { EventDetail } from "@acroyoga/shared/types/events";
import type { TeacherProfileDetail } from "@acroyoga/shared/types/teachers";
import {
  buildEventJsonLd,
  buildTeacherJsonLd,
} from "@/lib/seo/structured-data";

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

describe("JSON-LD output validation", () => {
  describe("event JSON-LD", () => {
    it("published event produces valid JSON-LD string", () => {
      const ld = buildEventJsonLd(makeEvent());
      expect(ld).not.toBeNull();
      const json = JSON.stringify(ld);
      expect(json).toContain('"@context":"https://schema.org"');
      expect(json).toContain('"@type":"Event"');
    });

    it("published event includes all required Schema.org fields for JSON-LD", () => {
      const event = makeEvent();
      const ld = buildEventJsonLd(event)!;
      expect(ld.name).toBe(event.title);
      expect(ld.startDate).toBe(event.startDatetime);
      expect(ld.endDate).toBe(event.endDatetime);
      expect(ld.location["@type"]).toBe("Place");
      expect(ld.offers["@type"]).toBe("Offer");
      expect(ld.offers.price).toBe(event.cost);
      expect(ld.offers.priceCurrency).toBe(event.currency);
      expect(ld.organizer["@type"]).toBe("Organization");
    });

    it("cancelled event has EventCancelled status in JSON-LD", () => {
      const ld = buildEventJsonLd(makeEvent({ status: "cancelled" }));
      expect(ld?.eventStatus).toBe("https://schema.org/EventCancelled");
    });

    it("draft event produces null — no JSON-LD script should be emitted", () => {
      const ld = buildEventJsonLd(makeEvent({ status: "draft" }));
      expect(ld).toBeNull();
    });

    it("free event has price: 0 in JSON-LD", () => {
      const ld = buildEventJsonLd(makeEvent({ cost: 0 }));
      expect(ld?.offers.price).toBe(0);
    });
  });

  describe("teacher JSON-LD", () => {
    it("active teacher produces Person schema", () => {
      const profile = makeTeacher();
      const ld = buildTeacherJsonLd(profile);
      expect(ld).not.toBeNull();
      expect(ld!["@type"]).toBe("Person");
      expect(ld!.name).toBe(profile.user_name);
    });

    it("deleted teacher produces null", () => {
      const ld = buildTeacherJsonLd(makeTeacher({ is_deleted: true }));
      expect(ld).toBeNull();
    });

    it("teacher JSON-LD includes specialties as knowsAbout", () => {
      const ld = buildTeacherJsonLd(makeTeacher({ specialties: ["thai", "lunar"] }));
      expect(ld?.knowsAbout).toEqual(["thai", "lunar"]);
    });

    it("teacher with photo includes image URL", () => {
      const ld = buildTeacherJsonLd(
        makeTeacher({
          photos: [
            {
              id: "p1",
              teacher_profile_id: "tp-001",
              url: "https://example.com/photo.jpg",
              sort_order: 0,
              created_at: "2026-01-01",
            },
          ],
        }),
      );
      expect(ld?.image).toBe("https://example.com/photo.jpg");
    });

    it("teacher without photo has undefined image", () => {
      const ld = buildTeacherJsonLd(makeTeacher({ photos: [] }));
      expect(ld?.image).toBeUndefined();
    });
  });
});
