import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@acroyoga/shared/types/i18n";
import { getLocale } from "next-intl/server";
import { getEventById } from "@/lib/events/service";
import { getShareMeta } from "@/lib/events/share";
import { buildEventMetadata } from "@/lib/seo/metadata";
import { buildEventJsonLd } from "@/lib/seo/structured-data";
import EventDetailPage from "@/components/events/EventDetailPage";
import JsonLd from "@/components/seo/JsonLd";
import SharePanel from "@/components/events/SharePanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const locale = (await getLocale()) as Locale;
  const event = await getEventById(id);
  if (!event) return {};
  return buildEventMetadata(event, locale);
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await getLocale()) as Locale;
  const event = await getEventById(id);
  const jsonLd = event ? buildEventJsonLd(event) : null;
  const shareMeta = await getShareMeta(id, locale);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/events"
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          ← Back to Events
        </Link>
        {shareMeta && <SharePanel meta={shareMeta} />}
      </div>
      <EventDetailPage />
    </div>
  );
}
