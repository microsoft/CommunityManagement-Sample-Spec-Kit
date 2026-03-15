"use client";

import { useEffect, useState } from "react";

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

  if (loading) return <div className="p-6">Loading event groups...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Event Groups</h1>
      {groups.length === 0 ? (
        <p className="text-gray-500">No event groups yet.</p>
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
                {new Date(group.start_date).toLocaleDateString()} &ndash;{" "}
                {new Date(group.end_date).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">{group.currency}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
