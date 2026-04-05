import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/notifications/unsubscribe";
import { NotificationType, NotificationChannel } from "@acroyoga/shared/types/notifications";

const unsubscribeRoute = () => import("@/app/api/unsubscribe/route");

let pg: PGlite;

describe("Unsubscribe Route", () => {
  let userId: string;

  beforeAll(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["unsub@test.com", "Unsub User"],
    );
    userId = userRes.rows[0].id;
  });

  afterAll(() => {
    clearTestDb();
  });

  it("token creation and verification round-trips", () => {
    const token = createUnsubscribeToken(
      userId,
      NotificationType.FOLLOW_NEW,
      NotificationChannel.EMAIL,
    );

    const payload = verifyUnsubscribeToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe(userId);
    expect(payload!.notificationType).toBe(NotificationType.FOLLOW_NEW);
    expect(payload!.channel).toBe(NotificationChannel.EMAIL);
  });

  it("rejects tampered tokens", () => {
    const token = createUnsubscribeToken(
      userId,
      NotificationType.FOLLOW_NEW,
      NotificationChannel.EMAIL,
    );

    // Tamper with the token
    const tampered = token.replace(token[5], token[5] === "a" ? "b" : "a");
    const payload = verifyUnsubscribeToken(tampered);
    expect(payload).toBeNull();
  });

  it("one-click unsubscribe updates preferences without authentication", async () => {
    const token = createUnsubscribeToken(
      userId,
      NotificationType.EVENT_RSVP,
      NotificationChannel.EMAIL,
    );

    const { GET } = await unsubscribeRoute();
    const url = new URL(`http://localhost/api/unsubscribe?token=${encodeURIComponent(token)}`);
    const req = { nextUrl: url } as never;
    const response = await GET(req);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Unsubscribed");
  });

  it("returns error page for invalid token", async () => {
    const { GET } = await unsubscribeRoute();
    const url = new URL("http://localhost/api/unsubscribe?token=invalid-token");
    const req = { nextUrl: url } as never;
    const response = await GET(req);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain("Invalid Link");
  });

  it("returns error page when no token provided", async () => {
    const { GET } = await unsubscribeRoute();
    const url = new URL("http://localhost/api/unsubscribe");
    const req = { nextUrl: url } as never;
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it("actually updates preferences in the database", async () => {
    const token = createUnsubscribeToken(
      userId,
      NotificationType.REVIEW_POSTED,
      NotificationChannel.EMAIL,
    );

    const { GET } = await unsubscribeRoute();
    const url = new URL(`http://localhost/api/unsubscribe?token=${encodeURIComponent(token)}`);
    await GET({ nextUrl: url } as never);

    // Verify the preference was updated
    const result = await pg.query<{ enabled: boolean }>(
      `SELECT enabled FROM notification_preferences
       WHERE user_id = $1 AND notification_type = 'review_posted' AND channel = 'email'`,
      [userId],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].enabled).toBe(false);
  });
});
