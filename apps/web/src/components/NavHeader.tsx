"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { NAV_MESSAGES as msg } from "./nav-messages";

const navLinks = [
  { href: "/", label: msg.navHome },
  { href: "/events", label: msg.navEvents },
  { href: "/directory", label: msg.navDirectory },
  { href: "/teachers", label: msg.navTeachers },
  { href: "/profile", label: msg.navProfile },
  { href: "/settings", label: msg.navSettings },
];

export default function NavHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-xl font-bold text-primary">
            {msg.brandName}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-primary border-b-2 border-primary pb-1"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Auth display */}
            {status === "loading" ? (
              <span className="text-sm text-muted-foreground">...</span>
            ) : session?.user ? (
              <Link
                href="/profile"
                className="text-sm text-foreground hover:text-foreground font-medium"
              >
                {session.user.name ?? msg.myAccount}
              </Link>
            ) : (
              <Link
                href="/api/auth/signin"
                className="text-sm bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover"
              >
                {msg.signIn}
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {status !== "loading" && (
            session?.user ? (
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted"
              >
                {session.user.name ?? msg.myAccount}
              </Link>
            ) : (
              <Link
                href="/api/auth/signin"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-primary/10"
              >
                {msg.signIn}
              </Link>
            )
          )}
        </nav>
      )}
    </header>
  );
}
