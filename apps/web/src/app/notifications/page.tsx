"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  read: boolean;
  createdAt: string;
}

const NOTIFICATIONS_MESSAGES = {
  title: "Notifications",
  noNotifications: "No notifications yet",
  markAllAsRead: "Mark all as read",
  showUnread: "Unread",
  showAll: "All",
  loadMore: "Load more",
} as const;

function getResourceLink(resourceType: string | null, resourceId: string | null): string {
  if (!resourceType || !resourceId) return "#";
  switch (resourceType) {
    case "event":
      return `/events/${resourceId}`;
    case "review":
      return `/teachers/${resourceId}`;
    case "profile":
      return `/directory/${resourceId}`;
    default:
      return "#";
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?page=${pageNum}&pageSize=20`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications((prev) =>
        append ? [...prev, ...(data.notifications ?? [])] : (data.notifications ?? []),
      );
      setTotal(data.total ?? 0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      // Silently fail
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Mark each unread notification as read
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}/read`, { method: "POST" }),
        ),
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Silently fail
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const hasMore = notifications.length < total;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{NOTIFICATIONS_MESSAGES.title}</h1>
        <button
          onClick={handleMarkAllAsRead}
          className="text-sm text-primary hover:text-primary-hover"
        >
          {NOTIFICATIONS_MESSAGES.markAllAsRead}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-sm rounded-full ${
            filter === "all"
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {NOTIFICATIONS_MESSAGES.showAll}
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 text-sm rounded-full ${
            filter === "unread"
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {NOTIFICATIONS_MESSAGES.showUnread}
        </button>
      </div>

      {/* Notification list */}
      <div className="space-y-1">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {NOTIFICATIONS_MESSAGES.noNotifications}
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors ${
                !n.read ? "bg-primary/5 border-primary/20" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={getResourceLink(n.resourceType, n.resourceId)}
                  onClick={() => {
                    if (!n.read) handleMarkAsRead(n.id);
                  }}
                  className="block"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              </div>
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 disabled:opacity-50"
          >
            {loading ? "…" : NOTIFICATIONS_MESSAGES.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
