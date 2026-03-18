import Link from "next/link";
import EventDetailPage from "@/components/events/EventDetailPage";

export default function EventPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/events"
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 inline-block"
      >
        ← Back to Events
      </Link>
      <EventDetailPage />
    </div>
  );
}
