import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";

let pg: PGlite;

describe("Notifications DB (table tests)", () => {
  let userId: string;

  beforeEach(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["notify@test.com", "Notify User"],
    );
    userId = userRes.rows[0].id;
  });

  afterEach(() => {
    clearTestDb();
  });

  it("inserts a notification and retrieves it by user_id", async () => {
    await pg.query(
      `INSERT INTO notifications (user_id, type, title, body, resource_type, resource_id)
       VALUES ($1, $2, $3, $4, $5, gen_random_uuid())`,
      [userId, "event_rsvp", "New RSVP", "Someone RSVPed to your event", "event"],
    );

    const result = await pg.query<{
      id: string;
      user_id: string;
      type: string;
      title: string;
      body: string;
      read: boolean;
    }>(
      "SELECT id, user_id, type, title, body, read FROM notifications WHERE user_id = $1",
      [userId],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].type).toBe("event_rsvp");
    expect(result.rows[0].title).toBe("New RSVP");
    expect(result.rows[0].read).toBe(false);
  });

  it("marks a notification as read", async () => {
    const ins = await pg.query<{ id: string }>(
      `INSERT INTO notifications (user_id, type, title)
       VALUES ($1, 'follow_new', 'New follower') RETURNING id`,
      [userId],
    );
    const notifId = ins.rows[0].id;

    await pg.query("UPDATE notifications SET read = true WHERE id = $1", [notifId]);

    const result = await pg.query<{ read: boolean }>(
      "SELECT read FROM notifications WHERE id = $1",
      [notifId],
    );
    expect(result.rows[0].read).toBe(true);
  });

  it("queries notifications sorted by created_at DESC", async () => {
    await pg.query(
      `INSERT INTO notifications (user_id, type, title, created_at)
       VALUES ($1, 'event_rsvp', 'First', '2026-01-01T00:00:00Z')`,
      [userId],
    );
    await pg.query(
      `INSERT INTO notifications (user_id, type, title, created_at)
       VALUES ($1, 'follow_new', 'Second', '2026-01-02T00:00:00Z')`,
      [userId],
    );

    const result = await pg.query<{ title: string }>(
      "SELECT title FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    expect(result.rows[0].title).toBe("Second");
    expect(result.rows[1].title).toBe("First");
  });

  it("counts unread notifications", async () => {
    await pg.query(
      `INSERT INTO notifications (user_id, type, title, read)
       VALUES ($1, 'event_rsvp', 'Read one', true)`,
      [userId],
    );
    await pg.query(
      `INSERT INTO notifications (user_id, type, title, read)
       VALUES ($1, 'follow_new', 'Unread one', false)`,
      [userId],
    );
    await pg.query(
      `INSERT INTO notifications (user_id, type, title, read)
       VALUES ($1, 'review_posted', 'Unread two', false)`,
      [userId],
    );

    const result = await pg.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false",
      [userId],
    );
    expect(parseInt(result.rows[0].count)).toBe(2);
  });

  it("cascade deletes notifications when user is deleted", async () => {
    await pg.query(
      `INSERT INTO notifications (user_id, type, title) VALUES ($1, 'event_rsvp', 'Test')`,
      [userId],
    );

    await pg.query("DELETE FROM users WHERE id = $1", [userId]);

    const result = await pg.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1",
      [userId],
    );
    expect(parseInt((result.rows[0] as { count: string }).count)).toBe(0);
  });
});
