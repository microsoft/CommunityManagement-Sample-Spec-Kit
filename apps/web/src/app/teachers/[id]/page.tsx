import type { Metadata } from "next";
import type { Locale } from "@acroyoga/shared/types/i18n";
import { getLocale } from "next-intl/server";
import { getTeacherProfile } from "@/lib/teachers/profiles";
import { buildTeacherMetadata } from "@/lib/seo/metadata";
import { buildTeacherJsonLd } from "@/lib/seo/structured-data";
import JsonLd from "@/components/seo/JsonLd";
import TeacherDetailClient from "@/components/teachers/TeacherDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const locale = (await getLocale()) as Locale;
  const profile = await getTeacherProfile(id);
  if (!profile) return {};
  return buildTeacherMetadata(profile, locale);
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getTeacherProfile(id);
  const jsonLd = profile ? buildTeacherJsonLd(profile) : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <TeacherDetailClient />
    </>
  );
}
