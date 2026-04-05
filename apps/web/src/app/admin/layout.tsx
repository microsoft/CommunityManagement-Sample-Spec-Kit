"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_MESSAGES as msg } from "./admin-messages";

const adminLinks = [
  { href: "/admin", label: msg.navDashboard, exact: true },
  { href: "/admin/teachers", label: msg.navTeacherRequests, exact: false },
  { href: "/admin/concessions", label: msg.navConcessions, exact: false },
  { href: "/admin/permissions", label: msg.navPermissions, exact: false },
  { href: "/admin/requests", label: msg.navRequests, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">{msg.panelTitle}</span>
              <div className="hidden sm:ms-8 sm:flex sm:space-x-6">
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive(link.href, link.exact)
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
