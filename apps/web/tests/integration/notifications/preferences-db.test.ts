import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";

let pg: PGlite;

describe("Notification Preferences DB (table tests)", () => {
  let userId: string;

  beforeEach(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["prefs@test.com", "Prefs User"],
    );
    userId = userRes.rows[0].id;
  });

  afterEach(() => {
    clearTestDb();
  });

  it("inserts a preference and queries by user", async () => {
    await pg.query(
      `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
       VALUES ($1, 'event_rsvp', 'in_app', true)`,
      [userId],
    );

    const result = await pg.query<{
      notification_type: string;
      channel: string;
      enabled: boolean;
    }>(
      "SELECT notification_type, channel, enabled FROM notification_preferences WHERE user_id = $1",
      [userId],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].notification_type).toBe("event_rsvp");
    expect(result.rows[0].channel).toBe("in_app");
    expect(result.rows[0].enabled).toBe(true);
  });

  it("updates a preference per type per channel", async () => {
    await pg.query(
      `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
       VALUES ($1, 'follow_new', 'email', true)`,
      [userId],
    );

    await pg.query(
      `UPDATE notification_preferences SET enabled = false, updated_at = now()
       WHERE user_id = $1 AND notification_type = 'follow_new' AND channel = 'email'`,
      [userId],
    );

    const result = await pg.query<{ enabled: boolean }>(
      `SELECT enabled FROM notification_preferences
       WHERE user_id = $1 AND notification_type = 'follow_new' AND channel = 'email'`,
      [userId],
    );
    expect(result.rows[0].enabled).toBe(false);
  });

  it("enforces unique constraint on (user_id, notification_type, channel)", async () => {
    await pg.query(
      `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
       VALUES ($1, 'event_rsvp', 'in_app', true)`,
      [userId],
    );

    await expect(
      pg.query(
        `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
         VALUES ($1, 'event_rsvp', 'in_app', false)`,
        [userId],
      ),
    ).rejects.toThrow();
  });

  it("supports upsert via ON CONFLICT", async () => {
    await pg.query(
      `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
       VALUES ($1, 'review_posted', 'email', true)`,
      [userId],
    );

    await pg.query(
      `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
       VALUES ($1, 'review_posted', 'email', false)
       ON CONFLICT (user_id, notification_type, channel)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
      [userId],
    );

    const result = await pg.query<{ enabled: boolean }>(
      `SELECT enabled FROM notification_preferences
       WHERE user_id = $1 AND notification_type = 'review_posted' AND channel = 'email'`,
      [userId],
    );
    expect(result.rows[0].enabled).toBe(false);
  });

  it("queries all preferences for a user", async () => {
    await pg.query(
      `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
       VALUES ($1, 'event_rsvp', 'in_app', true), ($1, 'event_rsvp', 'email', false), ($1, 'follow_new', 'in_app', true)`,
      [userId],
    );

    const result = await pg.query<{ notification_type: string; channel: string }>(
      "SELECT notification_type, channel FROM notification_preferences WHERE user_id = $1 ORDER BY notification_type, channel",
      [userId],
    );
    expect(result.rows).toHaveLength(3);
  });

  it("cascade deletes preferences when user is deleted", async () => {
    await pg.query(
      `INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
       VALUES ($1, 'event_rsvp', 'in_app', true)`,
      [userId],
    );

    await pg.query("DELETE FROM users WHERE id = $1", [userId]);

    const result = await pg.query(
      "SELECT COUNT(*) as count FROM notification_preferences WHERE user_id = $1",
      [userId],
    );
    expect(parseInt((result.rows[0] as { count: string }).count)).toBe(0);
  });
});
