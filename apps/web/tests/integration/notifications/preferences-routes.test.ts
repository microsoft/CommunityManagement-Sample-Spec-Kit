import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import { NotificationType, NotificationChannel } from "@acroyoga/shared/types/notifications";

// Mock auth
const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getServerSession: () => mockGetServerSession(),
}));

const preferencesRoute = () => import("@/app/api/notifications/preferences/route");

let pg: PGlite;

describe("Notification Preferences API Routes", () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["prefs-route@test.com", "Prefs Route Test"],
    );
    userId = userRes.rows[0].id;

    const otherRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["other-prefs@test.com", "Other Prefs User"],
    );
    otherUserId = otherRes.rows[0].id;
  });

  afterAll(() => {
    clearTestDb();
  });

  describe("GET /api/notifications/preferences", () => {
    it("returns 401 without auth", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const { GET } = await preferencesRoute();
      const req = new Request("http://localhost/api/notifications/preferences") as never;
      const response = await GET(req);
      expect(response.status).toBe(401);
    });

    it("returns preferences for authenticated user", async () => {
      mockGetServerSession.mockResolvedValue({ userId });
      const { GET } = await preferencesRoute();
      const req = { nextUrl: new URL("http://localhost/api/notifications/preferences") } as never;
      const response = await GET(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.preferences).toBeDefined();
      expect(body.preferences.length).toBeGreaterThan(0);
      // All default preferences should be enabled
      expect(body.preferences.every((p: { enabled: boolean }) => p.enabled)).toBe(true);
    });
  });

  describe("PUT /api/notifications/preferences", () => {
    it("returns 401 without auth", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const { PUT } = await preferencesRoute();
      const req = new Request("http://localhost/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationType: NotificationType.EVENT_RSVP,
          channel: NotificationChannel.EMAIL,
          enabled: false,
        }),
      }) as never;
      const response = await PUT(req);
      expect(response.status).toBe(401);
    });

    it("updates preference with valid data", async () => {
      mockGetServerSession.mockResolvedValue({ userId });
      const { PUT } = await preferencesRoute();
      const req = new Request("http://localhost/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationType: NotificationType.FOLLOW_NEW,
          channel: NotificationChannel.EMAIL,
          enabled: false,
        }),
      }) as never;
      const response = await PUT(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.preference.notificationType).toBe(NotificationType.FOLLOW_NEW);
      expect(body.preference.channel).toBe(NotificationChannel.EMAIL);
      expect(body.preference.enabled).toBe(false);
    });

    it("returns 400 for invalid notification type", async () => {
      mockGetServerSession.mockResolvedValue({ userId });
      const { PUT } = await preferencesRoute();
      const req = new Request("http://localhost/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationType: "invalid_type",
          channel: "email",
          enabled: false,
        }),
      }) as never;
      const response = await PUT(req);
      expect(response.status).toBe(400);
    });

    it("each user can only modify their own preferences", async () => {
      // User 1 disables email for follow_new
      mockGetServerSession.mockResolvedValue({ userId });
      const { PUT } = await preferencesRoute();
      await PUT(new Request("http://localhost/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationType: NotificationType.FOLLOW_NEW,
          channel: NotificationChannel.EMAIL,
          enabled: false,
        }),
      }) as never);

      // User 2's preferences should still be default (all enabled)
      mockGetServerSession.mockResolvedValue({ userId: otherUserId });
      const { GET } = await preferencesRoute();
      const res = await GET({ nextUrl: new URL("http://localhost/api/notifications/preferences") } as never);
      const body = await res.json();
      const followEmail = body.preferences.find(
        (p: { notificationType: string; channel: string }) =>
          p.notificationType === NotificationType.FOLLOW_NEW &&
          p.channel === NotificationChannel.EMAIL,
      );
      expect(followEmail?.enabled).toBe(true);
    });
  });
});
