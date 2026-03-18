"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Occurrence {
  eventId: string;
  date: string;
  startDatetime: string;
  endDatetime: string;
  title: string;
  capacity: number;
  isCancelled: boolean;
  isModified: boolean;
  rsvpCount: number;
}

export default function OccurrencesPage() {
  const { id } = useParams<{ id: string }>();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${id}/occurrences`)
      .then((res) => res.json())
      .then((data) => {
        setOccurrences(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-6">Loading occurrences...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upcoming Occurrences</h1>
      {occurrences.length === 0 ? (
        <p className="text-gray-500">No upcoming occurrences.</p>
      ) : (
        <ul className="space-y-3">
          {occurrences.map((occ) => (
            <li
              key={occ.date}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{occ.title}</p>
                <p className="text-sm text-gray-600">
                  {new Date(occ.startDatetime).toLocaleDateString()} &mdash;{" "}
                  {new Date(occ.startDatetime).toLocaleTimeString()} to{" "}
                  {new Date(occ.endDatetime).toLocaleTimeString()}
                </p>
                {occ.isModified && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                    Modified
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm">
                  {occ.rsvpCount} / {occ.capacity} RSVPs
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
