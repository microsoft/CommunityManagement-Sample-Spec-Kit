import { Suspense } from "react";
import EventsListPage from "@/components/events/EventsListPage";

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <EventsListPage />
    </Suspense>
  );
}
