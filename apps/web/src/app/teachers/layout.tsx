import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BASE_URL } from "@/lib/config";
import { buildAlternateLanguages } from "@/lib/seo/canonical";

export const metadata: Metadata = {
  title: "Teachers — AcroYoga Community",
  description:
    "Browse verified AcroYoga teachers, view profiles, certifications, and reviews.",
  alternates: {
    canonical: `${BASE_URL}/teachers`,
    languages: buildAlternateLanguages("/teachers"),
  },
  openGraph: {
    title: "Teachers — AcroYoga Community",
    description:
      "Browse verified AcroYoga teachers, view profiles, certifications, and reviews.",
    url: `${BASE_URL}/teachers`,
    type: "website",
  },
};

export default function TeachersLayout({ children }: { children: ReactNode }) {
  return children;
}
