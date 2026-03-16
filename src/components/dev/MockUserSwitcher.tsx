"use client";

import { useCallback, useEffect, useState } from "react";

interface MockUser {
  id: string | null;
  slug: string;
  name: string;
  displayRole: string;
}

const ROLE_COLORS: Record<string, string> = {
  "Global Admin": "#dc2626",
  "Country Admin (UK)": "#ea580c",
  "City Admin (Bristol)": "#ca8a04",
  "Event Creator (Bristol)": "#16a34a",
  Member: "#2563eb",
  Visitor: "#6b7280",
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
  const badgeColor = ROLE_COLORS[displayRole] ?? "#6b7280";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 9999,
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
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
          gap: "8px",
          padding: "8px 12px",
          background: "#1e1e1e",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: "8px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: badgeColor,
          }}
        />
        <span>{displayName}</span>
        <span
          style={{
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "4px",
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
            bottom: "48px",
            right: "0",
            width: "280px",
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid #333",
              color: "#888",
              fontSize: "11px",
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
            const color = ROLE_COLORS[user.displayRole] ?? "#6b7280";

            return (
              <button
                key={user.slug}
                role="option"
                aria-selected={isActive}
                onClick={() => switchUser(user.slug)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 12px",
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
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{user.name}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: color,
                    color: "#fff",
                    opacity: user.slug === "anonymous" ? 0.5 : 1,
                  }}
                >
                  {user.displayRole}
                </span>
                {isActive && (
                  <span style={{ color: "#4ade80", fontSize: "12px" }}>
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
