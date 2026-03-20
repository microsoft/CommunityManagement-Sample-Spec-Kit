"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsLinks = [
  { href: "/settings", label: "Overview" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/privacy", label: "Privacy" },
  { href: "/settings/teacher", label: "Teacher Application" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    fetch("/api/profiles/me")
      .then((r) => {
        setAuthStatus(r.status === 401 ? "unauthenticated" : "authenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, []);

  if (authStatus === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 text-lg">Please sign in to access settings.</p>
        <Link
          href="/api/auth/signin"
          className="text-indigo-600 hover:text-indigo-800 font-medium mt-4 inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-56 shrink-0">
          <nav className="space-y-1">
            {settingsLinks.map((link) => {
              const isActive =
                link.href === "/settings"
                  ? pathname === "/settings"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <span className="block px-3 py-2 text-sm text-gray-400 cursor-default">
              Payment Setup (coming soon)
            </span>
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
