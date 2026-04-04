import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import { clearQueue, MemoryJobQueue, setTestQueue } from "@/lib/jobs/queue";
import { NotificationType } from "@acroyoga/shared/types/notifications";

// Mock auth
const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getServerSession: () => mockGetServerSession(),
}));

const notificationsRoute = () => import("@/app/api/notifications/route");
const readRoute = () => import("@/app/api/notifications/[id]/read/route");

let pg: PGlite;
let testQueue: MemoryJobQueue;

describe("Notification API Routes", () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    testQueue = new MemoryJobQueue();
    setTestQueue(testQueue);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["route-test@test.com", "Route Test"],
    );
    userId = userRes.rows[0].id;

    const otherRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["other-route@test.com", "Other User"],
    );
    otherUserId = otherRes.rows[0].id;
  });

  beforeEach(() => {
    testQueue.reset();
  });

  afterAll(() => {
    clearTestDb();
    clearQueue();
  });

  describe("GET /api/notifications", () => {
    it("returns 401 without auth", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const { GET } = await notificationsRoute();
      const req = new Request("http://localhost/api/notifications") as never;
      const response = await GET(req);
      expect(response.status).toBe(401);
    });

    it("returns paginated notifications for authenticated user", async () => {
      mockGetServerSession.mockResolvedValue({ userId });

      // Seed a notification
      await pg.query(
        `INSERT INTO notifications (user_id, type, title, read) VALUES ($1, 'event_rsvp', 'Test notif', false)`,
        [userId],
      );

      const { GET } = await notificationsRoute();
      // Use a Request with URL that has searchParams
      const url = new URL("http://localhost/api/notifications?page=1&pageSize=10");
      const req = { nextUrl: url } as never;
      const response = await GET(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.notifications.length).toBeGreaterThanOrEqual(1);
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("unreadCount");
    });
  });

  describe("POST /api/notifications/:id/read", () => {
    it("returns 401 without auth", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const { POST } = await readRoute();
      const req = new Request("http://localhost/api/notifications/fake-id/read", {
        method: "POST",
      });
      const response = await POST(req as never, {
        params: Promise.resolve({ id: "fake-id" }),
      });
      expect(response.status).toBe(401);
    });

    it("marks notification as read for the owner", async () => {
      mockGetServerSession.mockResolvedValue({ userId });

      // Seed a notification
      const ins = await pg.query<{ id: string }>(
        `INSERT INTO notifications (user_id, type, title) VALUES ($1, 'follow_new', 'Follower') RETURNING id`,
        [userId],
      );
      const notifId = ins.rows[0].id;

      const { POST } = await readRoute();
      const req = new Request(`http://localhost/api/notifications/${notifId}/read`, {
        method: "POST",
      });
      const response = await POST(req as never, {
        params: Promise.resolve({ id: notifId }),
      });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.read).toBe(true);
    });

    it("returns 404 for other users notification (ownership check / 403 equivalent)", async () => {
      mockGetServerSession.mockResolvedValue({ userId: otherUserId });

      // Seed a notification belonging to userId (not otherUserId)
      const ins = await pg.query<{ id: string }>(
        `INSERT INTO notifications (user_id, type, title) VALUES ($1, 'event_rsvp', 'Not yours') RETURNING id`,
        [userId],
      );
      const notifId = ins.rows[0].id;

      const { POST } = await readRoute();
      const req = new Request(`http://localhost/api/notifications/${notifId}/read`, {
        method: "POST",
      });
      const response = await POST(req as never, {
        params: Promise.resolve({ id: notifId }),
      });
      // markAsRead uses WHERE user_id = $2 so it returns not found for wrong user
      expect(response.status).toBe(404);
    });
  });
});
