import { Suspense } from "react";
import ExplorerPage from "@/components/events/ExplorerPage";

export const metadata = {
  title: "Events Explorer",
  description: "Explore community events by calendar, map, and location.",
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
