import type { EventDetail, EventStatus } from "@acroyoga/shared/types/events";
import type { TeacherProfileDetail } from "@acroyoga/shared/types/teachers";
import type {
  EventStructuredData,
  TeacherStructuredData,
  SchemaEventStatus,
  SchemaAvailability,
} from "@acroyoga/shared/types/seo";
import { BASE_URL } from "@/lib/config";

function eventStatusToSchema(status: EventStatus): SchemaEventStatus | null {
  switch (status) {
    case "published":
      return "https://schema.org/EventScheduled";
    case "cancelled":
      return "https://schema.org/EventCancelled";
    case "draft":
      return null;
  }
}

function availabilityToSchema(
  confirmedCount: number,
  capacity: number,
): SchemaAvailability {
  if (confirmedCount >= capacity) return "https://schema.org/SoldOut";
  return "https://schema.org/InStock";
}

export function buildEventJsonLd(
  event: EventDetail,
): EventStructuredData | null {
  const schemaStatus = eventStatusToSchema(event.status);
  if (schemaStatus === null) return null;

  const price = event.cost;
  const eventUrl = `${BASE_URL}/events/${event.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startDatetime,
    endDate: event.endDatetime,
    description: event.description ?? null,
    eventStatus: schemaStatus,
    eventAttendanceMode:
      "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venueName,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.cityName,
      },
    },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: event.currency,
      availability: availabilityToSchema(
        event.confirmedCount,
        event.capacity,
      ),
      url: eventUrl,
    },
    image: event.posterImageUrl ? [event.posterImageUrl] : null,
    organizer: {
      "@type": "Organization",
      name: "AcroYoga Community",
      url: BASE_URL,
    },
  };
}

export function buildTeacherJsonLd(
  profile: TeacherProfileDetail,
): TeacherStructuredData | null {
  if (profile.is_deleted) return null;

  const firstPhoto = profile.photos?.[0]?.url;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.user_name,
    description: profile.bio ?? null,
    url: `${BASE_URL}/teachers/${profile.id}`,
    image: firstPhoto,
    jobTitle: "AcroYoga Teacher",
    knowsAbout: profile.specialties,
  };
}
