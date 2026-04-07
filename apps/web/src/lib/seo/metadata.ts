import type { Metadata } from "next";
import type { EventDetail } from "@acroyoga/shared/types/events";
import type { TeacherProfileDetail } from "@acroyoga/shared/types/teachers";
import type { Locale } from "@acroyoga/shared/types/i18n";
import { BASE_URL } from "@/lib/config";
import { buildCanonicalUrl, buildAlternateLanguages } from "./canonical";

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export function buildEventMetadata(
  event: EventDetail,
  locale: Locale,
): Metadata {
  const title = truncate(event.title, 70);
  const description = truncate(
    event.description
      ? event.description
      : `${event.category} event in ${event.cityName}`,
    160,
  );
  const canonicalUrl = buildCanonicalUrl(`/events/${event.id}`);
  const imageUrl = event.posterImageUrl
    ? `${BASE_URL}/api/og/events/${event.id}?v=${encodeURIComponent(event.updatedAt)}`
    : null;
  const noindex = event.status !== "published";

  return {
    title,
    description,
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
      languages: buildAlternateLanguages(`/events/${event.id}`),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale,
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export function buildTeacherMetadata(
  profile: TeacherProfileDetail,
  locale: Locale,
): Metadata {
  const title = truncate(`${profile.user_name} — AcroYoga Teacher`, 70);
  const description = truncate(
    profile.bio ?? "AcroYoga teacher on the AcroYoga Community platform.",
    160,
  );
  const canonicalUrl = buildCanonicalUrl(`/teachers/${profile.id}`);
  const firstPhoto = profile.photos?.[0]?.url ?? null;
  const imageUrl = firstPhoto
    ? `${BASE_URL}/api/og/teachers/${profile.id}?v=${encodeURIComponent(profile.updated_at)}`
    : null;
  const noindex = profile.is_deleted;

  return {
    title,
    description,
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
      languages: buildAlternateLanguages(`/teachers/${profile.id}`),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "profile",
      locale,
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
