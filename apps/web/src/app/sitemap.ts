import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/config";
import { getSitemapEvents, getSitemapTeachers } from "@/lib/seo/sitemap";
import { buildAlternateLanguages } from "@/lib/seo/canonical";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, teachers] = await Promise.all([
    getSitemapEvents(),
    getSitemapTeachers(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: { languages: buildAlternateLanguages("/") },
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
      alternates: { languages: buildAlternateLanguages("/events") },
    },
    {
      url: `${BASE_URL}/teachers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: { languages: buildAlternateLanguages("/teachers") },
    },
  ];

  const eventEntries: MetadataRoute.Sitemap = events.map((e) => ({
    url: e.url,
    lastModified: e.lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
    alternates: {
      languages: buildAlternateLanguages(new URL(e.url).pathname),
    },
  }));

  const teacherEntries: MetadataRoute.Sitemap = teachers.map((t) => ({
    url: t.url,
    lastModified: t.lastModified,
    changeFrequency: t.changeFrequency,
    priority: t.priority,
    alternates: {
      languages: buildAlternateLanguages(new URL(t.url).pathname),
    },
  }));

  return [...staticPages, ...eventEntries, ...teacherEntries];
}
