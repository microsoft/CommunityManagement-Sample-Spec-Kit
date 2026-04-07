import { db } from "@/lib/db/client";
import { BASE_URL } from "@/lib/config";
import type { SitemapEntry } from "@acroyoga/shared/types/seo";

interface EventRow {
  id: string;
  start_datetime: string;
  updated_at: string;
}

interface TeacherRow {
  id: string;
  updated_at: string;
}

export async function getSitemapEvents(): Promise<SitemapEntry[]> {
  const now = new Date().toISOString();
  const result = await db().query<EventRow>(
    `SELECT id, start_datetime, updated_at FROM events WHERE status = 'published' ORDER BY start_datetime DESC`,
  );
  return result.rows.map((row) => ({
    url: `${BASE_URL}/events/${row.id}`,
    lastModified: new Date(row.updated_at),
    changeFrequency: row.start_datetime > now ? "daily" : "monthly",
    priority: row.start_datetime > now ? 0.9 : 0.5,
  }));
}

export async function getSitemapTeachers(): Promise<SitemapEntry[]> {
  const result = await db().query<TeacherRow>(
    `SELECT id, updated_at FROM teacher_profiles WHERE is_deleted = false ORDER BY updated_at DESC`,
  );
  return result.rows.map((row) => ({
    url: `${BASE_URL}/teachers/${row.id}`,
    lastModified: new Date(row.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}
