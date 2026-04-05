// Notification preferences service — Spec 015
//
// Manages per-user, per-type, per-channel notification preferences.
// Default behavior: all channels enabled unless explicitly disabled (opt-out model).

import { db } from "@/lib/db/client";
import {
  NotificationType,
  NotificationChannel,
  type NotificationPreference,
} from "@acroyoga/shared/types/notifications";

// ─── Row type ────────────────────────────────────────────

interface PreferenceRow {
  id: string;
  user_id: string;
  notification_type: string;
  channel: string;
  enabled: boolean;
  updated_at: string;
}

function rowToPreference(row: PreferenceRow): NotificationPreference {
  return {
    id: row.id,
    userId: row.user_id,
    notificationType: row.notification_type as NotificationType,
    channel: row.channel as NotificationChannel,
    enabled: row.enabled,
    updatedAt: row.updated_at,
  };
}

// ─── Service functions ───────────────────────────────────

/**
 * Get all preferences for a user. Returns stored preferences plus defaults
 * for any type/channel combination that doesn't have an explicit row.
 */
export async function getPreferences(
  userId: string,
): Promise<NotificationPreference[]> {
  const result = await db().query<PreferenceRow>(
    "SELECT id, user_id, notification_type, channel, enabled, updated_at FROM notification_preferences WHERE user_id = $1",
    [userId],
  );

  const stored = result.rows.map(rowToPreference);
  const storedKeys = new Set(stored.map((p) => `${p.notificationType}:${p.channel}`));

  // Generate defaults for any missing type/channel combinations
  const allTypes = Object.values(NotificationType);
  const allChannels = Object.values(NotificationChannel);
  const defaults: NotificationPreference[] = [];

  for (const type of allTypes) {
    for (const channel of allChannels) {
      const key = `${type}:${channel}`;
      if (!storedKeys.has(key)) {
        defaults.push({
          id: `default-${type}-${channel}`,
          userId,
          notificationType: type,
          channel,
          enabled: true, // opt-out model: enabled by default
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return [...stored, ...defaults];
}

/**
 * Update (upsert) a single preference for a user.
 */
export async function updatePreference(
  userId: string,
  notificationType: NotificationType,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<NotificationPreference> {
  const result = await db().query<PreferenceRow>(
    `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, notification_type, channel)
     DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()
     RETURNING id, user_id, notification_type, channel, enabled, updated_at`,
    [userId, notificationType, channel, enabled],
  );

  return rowToPreference(result.rows[0]);
}

/**
 * Get all enabled channels for a given notification type and user.
 * Returns channels that should receive the notification.
 */
export async function getEnabledChannels(
  userId: string,
  notificationType: NotificationType,
): Promise<NotificationChannel[]> {
  // Get stored preferences for this type
  const result = await db().query<{ channel: string; enabled: boolean }>(
    `SELECT channel, enabled FROM notification_preferences
     WHERE user_id = $1 AND notification_type = $2`,
    [userId, notificationType],
  );

  const stored = new Map(result.rows.map((r) => [r.channel, r.enabled]));
  const allChannels = Object.values(NotificationChannel);

  // Return channels that are explicitly enabled or not stored (default enabled)
  return allChannels.filter((ch) => {
    const pref = stored.get(ch);
    return pref === undefined || pref === true;
  });
}

/**
 * Delete all preferences for a user (GDPR deletion).
 */
export async function deletePreferencesForUser(userId: string): Promise<void> {
  await db().query("DELETE FROM notification_preferences WHERE user_id = $1", [userId]);
}
