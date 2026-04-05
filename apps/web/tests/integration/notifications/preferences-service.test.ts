import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import {
  getPreferences,
  updatePreference,
  getEnabledChannels,
} from "@/lib/notifications/preferences";
import { NotificationType, NotificationChannel } from "@acroyoga/shared/types/notifications";

let pg: PGlite;

describe("Notification Preferences Service", () => {
  let userId: string;

  beforeEach(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["prefs-svc@test.com", "Prefs Service Test"],
    );
    userId = userRes.rows[0].id;
  });

  afterEach(() => {
    clearTestDb();
  });

  it("getPreferences returns defaults on first access", async () => {
    const prefs = await getPreferences(userId);

    // Should have one preference per type × channel (10 types × 2 channels = 20)
    const allTypes = Object.values(NotificationType);
    const allChannels = Object.values(NotificationChannel);
    expect(prefs).toHaveLength(allTypes.length * allChannels.length);

    // All should be enabled by default (opt-out model)
    expect(prefs.every((p) => p.enabled)).toBe(true);
  });

  it("updatePreference creates a new preference row", async () => {
    const pref = await updatePreference(
      userId,
      NotificationType.EVENT_RSVP,
      NotificationChannel.EMAIL,
      false,
    );

    expect(pref.notificationType).toBe(NotificationType.EVENT_RSVP);
    expect(pref.channel).toBe(NotificationChannel.EMAIL);
    expect(pref.enabled).toBe(false);
    expect(pref.userId).toBe(userId);
  });

  it("updatePreference toggles per type per channel", async () => {
    // Disable email for event_rsvp
    await updatePreference(userId, NotificationType.EVENT_RSVP, NotificationChannel.EMAIL, false);

    // Verify it's disabled
    const prefs = await getPreferences(userId);
    const emailPref = prefs.find(
      (p) =>
        p.notificationType === NotificationType.EVENT_RSVP &&
        p.channel === NotificationChannel.EMAIL,
    );
    expect(emailPref?.enabled).toBe(false);

    // In-app should still be enabled (default)
    const inAppPref = prefs.find(
      (p) =>
        p.notificationType === NotificationType.EVENT_RSVP &&
        p.channel === NotificationChannel.IN_APP,
    );
    expect(inAppPref?.enabled).toBe(true);

    // Re-enable email
    await updatePreference(userId, NotificationType.EVENT_RSVP, NotificationChannel.EMAIL, true);
    const updated = await getPreferences(userId);
    const reEnabled = updated.find(
      (p) =>
        p.notificationType === NotificationType.EVENT_RSVP &&
        p.channel === NotificationChannel.EMAIL,
    );
    expect(reEnabled?.enabled).toBe(true);
  });

  it("getEnabledChannels returns all channels when no preferences set", async () => {
    const channels = await getEnabledChannels(userId, NotificationType.EVENT_RSVP);
    expect(channels).toContain(NotificationChannel.IN_APP);
    expect(channels).toContain(NotificationChannel.EMAIL);
  });

  it("getEnabledChannels excludes disabled channels", async () => {
    await updatePreference(userId, NotificationType.FOLLOW_NEW, NotificationChannel.EMAIL, false);

    const channels = await getEnabledChannels(userId, NotificationType.FOLLOW_NEW);
    expect(channels).toContain(NotificationChannel.IN_APP);
    expect(channels).not.toContain(NotificationChannel.EMAIL);
  });

  it("getEnabledChannels returns empty when all channels disabled", async () => {
    await updatePreference(userId, NotificationType.PAYMENT_RECEIVED, NotificationChannel.IN_APP, false);
    await updatePreference(userId, NotificationType.PAYMENT_RECEIVED, NotificationChannel.EMAIL, false);

    const channels = await getEnabledChannels(userId, NotificationType.PAYMENT_RECEIVED);
    expect(channels).toHaveLength(0);
  });
});
