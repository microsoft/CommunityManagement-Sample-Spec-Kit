"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { EVENT_GROUP_MESSAGES as msg } from "./event-group-messages";

interface EventGroup {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  currency: string;
  poster_image_url: string | null;
}

export default function EventGroupsPage() {
  const locale = useLocale();
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/event-groups")
      .then((res) => res.json())
      .then((data) => {
        setGroups(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">{msg.loading}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{msg.title}</h1>
      {groups.length === 0 ? (
        <p className="text-gray-500">{msg.noGroups}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <a
              key={group.id}
              href={`/event-groups/${group.id}`}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg">{group.name}</h2>
              <p className="text-sm text-gray-500 capitalize">{group.type}</p>
              <p className="text-sm text-gray-600 mt-1">
                {formatEventDate(group.start_date, locale, undefined, { year: "numeric", month: "short", day: "numeric" })} &ndash;{" "}
                {formatEventDate(group.end_date, locale, undefined, { year: "numeric", month: "short", day: "numeric" })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{group.currency}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
