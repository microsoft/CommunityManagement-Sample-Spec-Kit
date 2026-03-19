"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TeacherSummary {
  id: string;
  display_name: string;
  bio: string | null;
  specialties: string[];
  badge_status: string;
  aggregate_rating: number | null;
  review_count: number;
  city: string | null;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [badge, setBadge] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (specialty) params.set("specialty", specialty);
    if (badge) params.set("badge", badge);

    setLoading(true);
    setError(null);
    fetch(`/api/teachers?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load teachers");
        return r.json();
      })
      .then((data) => {
        setTeachers(data.teachers ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });
  }, [query, specialty, badge]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Teachers</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search teachers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded-md flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="verified">Verified</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
        <input
          type="text"
          placeholder="Specialty..."
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">{error}</p>
          <button onClick={() => window.location.reload()} className="text-indigo-600 hover:underline mt-2">Retry</button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-lg p-4">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No teachers found.</p>
          <p className="text-gray-400 mt-2">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((t) => (
            <Link
              key={t.id}
              href={`/teachers/${t.id}`}
              className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="font-semibold text-lg text-gray-900">{t.display_name}</h2>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    t.badge_status === "verified"
                      ? "bg-green-100 text-green-800"
                      : t.badge_status === "expired"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {t.badge_status}
                </span>
              </div>
              {t.bio && (
                <p className="text-gray-600 text-sm line-clamp-2 mb-2">{t.bio}</p>
              )}
              {t.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {t.specialties.map((s) => (
                    <span
                      key={s}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {t.aggregate_rating && (
                <p className="text-sm text-gray-500">
                  ★ {t.aggregate_rating.toFixed(1)} ({t.review_count})
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
