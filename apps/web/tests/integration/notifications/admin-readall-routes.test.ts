import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import { clearQueue, MemoryJobQueue, setTestQueue } from "@/lib/jobs/queue";

// Mock auth
const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getServerSession: () => mockGetServerSession(),
}));

// Mock permission check — controlled per test
const mockCheckPermission = vi.fn();
vi.mock("@/lib/permissions/service", () => ({
  checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
}));

// Mock audit log — no-op
vi.mock("@/lib/permissions/audit", () => ({
  logAuditEvent: vi.fn(),
}));

const adminJobsRoute = () => import("@/app/api/admin/jobs/route");
const readAllRoute = () => import("@/app/api/notifications/read-all/route");

let pg: PGlite;
let testQueue: MemoryJobQueue;

describe("Admin Jobs Route + Read-All Route", () => {
  let adminId: string;
  let userId: string;

  beforeAll(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    testQueue = new MemoryJobQueue();
    setTestQueue(testQueue);

    const adminRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["admin-jobs@test.com", "Admin User"],
    );
    adminId = adminRes.rows[0].id;

    // Grant global_admin so the permission resolver finds it
    await pg.query(
      "INSERT INTO permission_grants (user_id, role, scope_type, scope_value, granted_by) VALUES ($1, 'global_admin', 'global', NULL, $1)",
      [adminId],
    );

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["regular-jobs@test.com", "Regular User"],
    );
    userId = userRes.rows[0].id;
  });

  beforeEach(() => {
    testQueue.reset();
    vi.clearAllMocks();
  });

  afterAll(() => {
    clearTestDb();
    clearQueue();
  });

  // ─── GET /api/admin/jobs ─────────────────────────────────

  describe("GET /api/admin/jobs", () => {
    it("returns 401 without auth", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const { GET } = await adminJobsRoute();
      const url = new URL("http://localhost/api/admin/jobs");
      const req = { nextUrl: url } as never;
      const response = await GET(req);
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-admin user", async () => {
      mockGetServerSession.mockResolvedValue({ userId });
      mockCheckPermission.mockResolvedValue({ allowed: false, effectiveRole: "member" });

      const { GET } = await adminJobsRoute();
      const url = new URL("http://localhost/api/admin/jobs");
      const req = { nextUrl: url } as never;
      const response = await GET(req);
      expect(response.status).toBe(403);
    });

    it("returns queue stats for admin user", async () => {
      mockGetServerSession.mockResolvedValue({ userId: adminId });
      mockCheckPermission.mockResolvedValue({ allowed: true, effectiveRole: "global_admin" });

      const { GET } = await adminJobsRoute();
      const url = new URL("http://localhost/api/admin/jobs");
      const req = { nextUrl: url } as never;
      const response = await GET(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.queue).toBeDefined();
      expect(body.queue).toHaveProperty("pending");
      expect(body.queue).toHaveProperty("active");
      expect(body.queue).toHaveProperty("completed");
      expect(body.queue).toHaveProperty("failed");
      expect(body.queue).toHaveProperty("failureRate");
      expect(body.recentErrors).toBeInstanceOf(Array);
    });
  });

  // ─── POST /api/notifications/read-all ────────────────────

  describe("POST /api/notifications/read-all", () => {
    it("returns 401 without auth", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const { POST } = await readAllRoute();
      const req = new Request("http://localhost/api/notifications/read-all", {
        method: "POST",
      });
      const response = await POST(req as never);
      expect(response.status).toBe(401);
    });

    it("marks all unread notifications as read", async () => {
      mockGetServerSession.mockResolvedValue({ userId });

      // Seed unread notifications
      await pg.query(
        `INSERT INTO notifications (user_id, type, title, read) VALUES ($1, 'event_rsvp', 'Notif 1', false)`,
        [userId],
      );
      await pg.query(
        `INSERT INTO notifications (user_id, type, title, read) VALUES ($1, 'follow_new', 'Notif 2', false)`,
        [userId],
      );
      await pg.query(
        `INSERT INTO notifications (user_id, type, title, read) VALUES ($1, 'review_posted', 'Notif 3', true)`,
        [userId],
      );

      const { POST } = await readAllRoute();
      const req = new Request("http://localhost/api/notifications/read-all", {
        method: "POST",
      });
      const response = await POST(req as never);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.updated).toBe(2); // Only the 2 unread ones

      // Verify in DB
      const unreadResult = await pg.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false",
        [userId],
      );
      expect(parseInt(unreadResult.rows[0].count)).toBe(0);
    });

    it("returns 0 when no unread notifications", async () => {
      mockGetServerSession.mockResolvedValue({ userId: adminId });

      const { POST } = await readAllRoute();
      const req = new Request("http://localhost/api/notifications/read-all", {
        method: "POST",
      });
      const response = await POST(req as never);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.updated).toBe(0);
    });
  });
});
