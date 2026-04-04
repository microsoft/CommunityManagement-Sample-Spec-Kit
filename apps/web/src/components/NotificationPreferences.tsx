"use client";

import { useCallback, useEffect, useState } from "react";

interface Preference {
  id: string;
  notificationType: string;
  channel: string;
  enabled: boolean;
}

const PREF_MESSAGES = {
  title: "Notification Preferences",
  description: "Choose how you want to be notified about different activities.",
  inApp: "In-App",
  email: "Email",
  saving: "Saving…",
  events: "Events",
  teachers: "Teachers & Reviews",
  community: "Community",
  payments: "Payments",
} as const;

const TYPE_LABELS: Record<string, string> = {
  event_rsvp: "Someone RSVPs to your event",
  waitlist_promotion: "You're promoted from a waitlist",
  event_cancellation: "An event you RSVPed to is cancelled",
  occurrence_cancellation: "A recurring event occurrence is cancelled",
  review_posted: "Someone reviews your teaching",
  review_reminder: "Reminder to review a past event",
  cert_expiry_warning: "Your certification is expiring",
  follow_new: "Someone follows you",
  report_resolved: "Your report is resolved",
  payment_received: "You receive a payment",
};

const CATEGORIES = {
  events: ["event_rsvp", "waitlist_promotion", "event_cancellation", "occurrence_cancellation"],
  teachers: ["review_posted", "review_reminder", "cert_expiry_warning"],
  community: ["follow_new", "report_resolved"],
  payments: ["payment_received"],
} as const;

const CHANNELS = ["in_app", "email"] as const;

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) return;
      const data = await res.json();
      setPreferences(data.preferences ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = async (
    notificationType: string,
    channel: string,
    enabled: boolean,
  ) => {
    const key = `${notificationType}:${channel}`;
    setSaving(key);

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationType, channel, enabled }),
      });

      if (res.ok) {
        setPreferences((prev) =>
          prev.map((p) =>
            p.notificationType === notificationType && p.channel === channel
              ? { ...p, enabled }
              : p,
          ),
        );
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(null);
    }
  };

  const getPreference = (type: string, channel: string): boolean => {
    const pref = preferences.find(
      (p) => p.notificationType === type && p.channel === channel,
    );
    return pref?.enabled ?? true; // default enabled (opt-out model)
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">…</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{PREF_MESSAGES.title}</h2>
      <p className="text-sm text-muted-foreground mb-6">{PREF_MESSAGES.description}</p>

      {(Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, readonly string[]][]).map(
        ([category, types]) => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-medium mb-3 capitalize">
              {PREF_MESSAGES[category]}
            </h3>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 mb-2 px-3">
              <div />
              <div className="text-xs font-medium text-muted-foreground text-center">
                {PREF_MESSAGES.inApp}
              </div>
              <div className="text-xs font-medium text-muted-foreground text-center">
                {PREF_MESSAGES.email}
              </div>
            </div>

            {/* Preference rows */}
            {types.map((type) => (
              <div
                key={type}
                className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-3 py-2 rounded-md hover:bg-muted/50"
              >
                <div className="text-sm">{TYPE_LABELS[type] ?? type}</div>
                {CHANNELS.map((channel) => {
                  const isEnabled = getPreference(type, channel);
                  const key = `${type}:${channel}`;
                  return (
                    <div key={channel} className="flex justify-center">
                      <button
                        onClick={() => handleToggle(type, channel, !isEnabled)}
                        disabled={saving === key}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isEnabled ? "bg-primary" : "bg-gray-300"
                        } ${saving === key ? "opacity-50" : ""}`}
                        role="switch"
                        aria-checked={isEnabled}
                        aria-label={`${TYPE_LABELS[type]} ${channel === "in_app" ? "in-app" : "email"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
