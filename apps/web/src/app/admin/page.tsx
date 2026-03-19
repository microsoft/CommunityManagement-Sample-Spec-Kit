"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardCounts {
  pendingTeachers: number;
  pendingConcessions: number;
}

const adminSections = [
  {
    href: "/admin/teachers",
    title: "Teacher Requests",
    countKey: "pendingTeachers" as const,
    description: "Review pending teacher applications.",
  },
  {
    href: "/admin/concessions",
    title: "Concessions",
    countKey: "pendingConcessions" as const,
    description: "Review pending concession applications.",
  },
  {
    href: "/admin/permissions",
    title: "Permissions",
    countKey: null,
    description: "Manage user roles and permissions.",
  },
  {
    href: "/admin/requests",
    title: "Requests",
    countKey: null,
    description: "View and process admin requests.",
  },
];

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>({
    pendingTeachers: 0,
    pendingConcessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/teachers/requests")
        .then((r) => r.ok ? r.json() : { requests: [] })
        .then((d) => (d.requests ?? []).length),
      fetch("/api/concessions?pending=true")
        .then((r) => r.ok ? r.json() : [])
        .then((d) => (Array.isArray(d) ? d : []).length),
    ])
      .then(([teachers, concessions]) => {
        setCounts({ pendingTeachers: teachers, pendingConcessions: concessions });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-6">Overview of pending actions and platform management.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <h2 className="font-semibold text-gray-900">{section.title}</h2>
              {section.countKey && !loading && (
                <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {counts[section.countKey]} pending
                </span>
              )}
              {section.countKey && loading && (
                <span className="animate-pulse bg-gray-200 h-5 w-16 rounded-full" />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
