"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface GroupDetail {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  currency: string;
  poster_image_url: string | null;
  members: Array<{ event_id: string; sort_order: number }>;
}

interface TicketType {
  id: string;
  name: string;
  cost: string;
  concession_cost: string | null;
  capacity: number;
  covers_all_events: boolean;
}

export default function EventGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/event-groups/${groupId}`).then((r) => r.json()),
      fetch(`/api/event-groups/${groupId}/tickets`).then((r) => r.json()),
    ]).then(([g, t]) => {
      setGroup(g);
      setTickets(t);
      setLoading(false);
    });
  }, [groupId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!group) return <div className="p-6">Group not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <p className="text-sm text-gray-500 capitalize mb-2">{group.type}</p>
      <p className="text-gray-600 mb-4">
        {new Date(group.start_date).toLocaleDateString()} &ndash;{" "}
        {new Date(group.end_date).toLocaleDateString()} &middot; {group.currency}
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Events ({group.members.length})</h2>
      <ul className="space-y-1 mb-6">
        {group.members.map((m) => (
          <li key={m.event_id} className="text-sm">
            <a href={`/events/${m.event_id}`} className="text-blue-600 hover:underline">
              Event {m.event_id}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mb-3">Ticket Types</h2>
      {tickets.length === 0 ? (
        <p className="text-gray-500">No ticket types configured.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{t.name}</h3>
              <p className="text-sm text-gray-600">
                {group.currency} {t.cost}
                {t.concession_cost && (
                  <span className="ml-2 text-green-700">
                    (Concession: {group.currency} {t.concession_cost})
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                Capacity: {t.capacity} &middot;{" "}
                {t.covers_all_events ? "Covers all events" : "Partial coverage"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
