"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { EVENT_GROUP_MESSAGES as msg } from "../event-group-messages";

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
  const locale = useLocale();
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

  if (loading) return <div className="p-6">{msg.detailLoading}</div>;
  if (!group) return <div className="p-6">{msg.detailNotFound}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <p className="text-sm text-gray-500 capitalize mb-2">{group.type}</p>
      <p className="text-gray-600 mb-4">
        {formatEventDate(group.start_date, locale, undefined, { year: "numeric", month: "short", day: "numeric" })} &ndash;{" "}
        {formatEventDate(group.end_date, locale, undefined, { year: "numeric", month: "short", day: "numeric" })} &middot; {group.currency}
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">{msg.eventsHeading} ({group.members.length})</h2>
      <ul className="space-y-1 mb-6">
        {group.members.map((m) => (
          <li key={m.event_id} className="text-sm">
            <a href={`/events/${m.event_id}`} className="text-blue-600 hover:underline">
              Event {m.event_id}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mb-3">{msg.ticketTypesHeading}</h2>
      {tickets.length === 0 ? (
        <p className="text-gray-500">{msg.noTicketTypes}</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{t.name}</h3>
              <p className="text-sm text-gray-600">
                {group.currency} {t.cost}
                {t.concession_cost && (
                  <span className="ms-2 text-green-700">
                    ({msg.concessionLabel} {group.currency} {t.concession_cost})
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {msg.capacityLabel} {t.capacity} &middot;{" "}
                {t.covers_all_events ? msg.coversAll : msg.partialCoverage}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
