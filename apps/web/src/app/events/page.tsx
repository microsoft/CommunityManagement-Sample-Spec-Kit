import { Suspense } from "react";
import type { Metadata } from "next";
import ExplorerPage from "@/components/events/ExplorerPage";
import { BASE_URL } from "@/lib/config";
import { buildAlternateLanguages } from "@/lib/seo/canonical";

export const metadata: Metadata = {
  title: "Events Explorer",
  description: "Explore community events by calendar, map, and location.",
  alternates: {
    canonical: `${BASE_URL}/events`,
    languages: buildAlternateLanguages("/events"),
  },
};

export default function EventsPage() {
  return (
    <div style={{ height: "calc(100vh - 64px)" }}>
      <Suspense
        fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <span>Loading explorer…</span>
          </div>
        }
      >
        <ExplorerPage />
      </Suspense>
    </div>
  );
}
