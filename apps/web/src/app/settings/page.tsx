"use client";

import Link from "next/link";

const sections = [
  {
    href: "/settings/account",
    title: "Account",
    description: "Manage data exports and account deletion.",
  },
  {
    href: "/settings/privacy",
    title: "Privacy",
    description: "Manage blocked and muted users.",
  },
  {
    href: "/settings/teacher",
    title: "Teacher Application",
    description: "Apply to become a verified teacher.",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-600 mb-6">Manage your account preferences and privacy.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold text-gray-900">{s.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
