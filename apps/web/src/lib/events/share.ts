import { getEventById } from "@/lib/events/service";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export interface ShareMeta {
  url: string;
  title: string;
  description: string;
  ogTags: Record<string, string>;
}

export async function getShareMeta(eventId: string): Promise<ShareMeta | null> {
  const event = await getEventById(eventId);
  if (!event) return null;

  const url = `${BASE_URL}/events/${eventId}`;
  const description = event.description
    ? event.description.slice(0, 160)
    : `${event.category} event in ${event.cityName}`;

  return {
    url,
    title: event.title,
    description,
    ogTags: {
      "og:title": event.title,
      "og:description": description,
      "og:url": url,
      "og:type": "website",
      "og:image": event.posterImageUrl ?? "",
      "twitter:card": "summary_large_image",
      "twitter:title": event.title,
      "twitter:description": description,
    },
  };
}
