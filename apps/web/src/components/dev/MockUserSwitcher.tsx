"use client";

import { useCallback, useEffect, useState } from "react";

interface MockUser {
  id: string | null;
  slug: string;
  name: string;
  displayRole: string;
}

const ROLE_COLORS: Record<string, string> = {
  "Global Admin": "var(--color-semantic-error)",
  "Country Admin (UK)": "var(--color-semantic-warning)",
  "City Admin (Bristol)": "#ca8a04",
  "Event Creator (Bristol)": "var(--color-semantic-success)",
  Member: "var(--color-semantic-info)",
  Visitor: "var(--color-surface-muted-foreground)",
};

export function MockUserSwitcher() {
  const [activeUser, setActiveUser] = useState<MockUser | null>(null);
  const [users, setUsers] = useState<MockUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/mock-user");
      if (!res.ok) return;
      const data = await res.json();
      setActiveUser(data.activeUser);
      setUsers(data.availableUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const switchUser = async (slug: string) => {
    const res = await fetch("/api/dev/mock-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.ok) {
      const data = await res.json();
      setActiveUser(data.activeUser);
      setIsOpen(false);
      // Reload to reflect new user in server components
      window.location.reload();
    }
  };

  if (loading) return null;

  const displayName = activeUser?.name ?? "Anonymous";
  const displayRole = activeUser?.displayRole ?? "Visitor";
  const badgeColor = ROLE_COLORS[displayRole] ?? "var(--color-surface-muted-foreground)";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "var(--spacing-4)",
        right: "var(--spacing-4)",
        zIndex: 9999,
        fontFamily: "var(--font-family-sans)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle mock user switcher"
        aria-expanded={isOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          padding: "var(--spacing-2) var(--spacing-3)",
          background: "#1e1e1e",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "var(--spacing-2)",
            height: "var(--spacing-2)",
            borderRadius: "var(--radius-full)",
            background: badgeColor,
          }}
        />
        <span>{displayName}</span>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            padding: "2px var(--spacing-2)",
            borderRadius: "var(--radius-sm)",
            background: badgeColor,
            color: "#fff",
          }}
        >
          {displayRole}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select mock user"
          style={{
            position: "absolute",
            bottom: "var(--spacing-12)",
            right: "0",
            width: "280px",
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "var(--spacing-2) var(--spacing-3)",
              borderBottom: "1px solid #333",
              color: "#888",
              fontSize: "var(--font-size-xs)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Switch Mock User
          </div>
          {users.map((user) => {
            const isActive =
              (activeUser?.slug === user.slug) ||
              (!activeUser && user.slug === "anonymous");
            const color = ROLE_COLORS[user.displayRole] ?? "var(--color-surface-muted-foreground)";

            return (
              <button
                key={user.slug}
                role="option"
                aria-selected={isActive}
                onClick={() => switchUser(user.slug)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-2)",
                  width: "100%",
                  padding: "var(--spacing-3) var(--spacing-3)",
                  background: isActive ? "#2a2a2a" : "transparent",
                  color: "#fff",
                  border: "none",
                  borderBottom: "1px solid #2a2a2a",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#252525";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: "var(--spacing-2)",
                    height: "var(--spacing-2)",
                    borderRadius: "var(--radius-full)",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{user.name}</span>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    padding: "2px var(--spacing-2)",
                    borderRadius: "var(--radius-sm)",
                    background: color,
                    color: "#fff",
                    opacity: user.slug === "anonymous" ? 0.5 : 1,
                  }}
                >
                  {user.displayRole}
                </span>
                {isActive && (
                  <span style={{ color: "var(--color-semantic-success)", fontSize: "var(--font-size-xs)" }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
