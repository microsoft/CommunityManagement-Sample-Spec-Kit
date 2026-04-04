import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import { clearQueue, MemoryJobQueue, setTestQueue } from "@/lib/jobs/queue";
import {
  createNotification,
  getNotificationsForUser,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotificationsForUser,
} from "@/lib/notifications/service";
import { NotificationType } from "@acroyoga/shared/types/notifications";

let pg: PGlite;
let testQueue: MemoryJobQueue;

describe("Notification Service", () => {
  let userId: string;

  beforeEach(async () => {
    pg = await createTestDb();
    setTestDb(pg);

    testQueue = new MemoryJobQueue();
    setTestQueue(testQueue);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["service-test@test.com", "Service Test"],
    );
    userId = userRes.rows[0].id;
  });

  afterEach(() => {
    clearTestDb();
    clearQueue();
  });

  it("createNotification inserts and returns a notification", async () => {
    const notif = await createNotification({
      userId,
      type: NotificationType.EVENT_RSVP,
      resourceId: "00000000-0000-0000-0000-000000000001",
    });

    expect(notif.id).toBeTruthy();
    expect(notif.userId).toBe(userId);
    expect(notif.type).toBe(NotificationType.EVENT_RSVP);
    expect(notif.title).toBe("New RSVP");
    expect(notif.read).toBe(false);
  });

  it("createNotification enqueues a delivery job", async () => {
    await createNotification({
      userId,
      type: NotificationType.FOLLOW_NEW,
    });

    const jobs = testQueue.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].type).toBe("send_notification");
  });

  it("getNotificationsForUser returns paginated results", async () => {
    // Create 3 notifications
    for (let i = 0; i < 3; i++) {
      await createNotification({
        userId,
        type: NotificationType.EVENT_RSVP,
        title: `Notification ${i}`,
      });
    }

    const result = await getNotificationsForUser(userId, { page: 1, pageSize: 2 });
    expect(result.notifications).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it("getNotificationsForUser returns notifications sorted by created_at DESC", async () => {
    await createNotification({
      userId,
      type: NotificationType.EVENT_RSVP,
      title: "First",
    });
    // Small delay to ensure different timestamps
    await createNotification({
      userId,
      type: NotificationType.FOLLOW_NEW,
      title: "Second",
    });

    const result = await getNotificationsForUser(userId);
    expect(result.notifications[0].title).toBe("Second");
    expect(result.notifications[1].title).toBe("First");
  });

  it("markAsRead marks notification and returns true", async () => {
    const notif = await createNotification({
      userId,
      type: NotificationType.REVIEW_POSTED,
    });

    const result = await markAsRead(notif.id, userId);
    expect(result).toBe(true);

    const { notifications } = await getNotificationsForUser(userId);
    expect(notifications[0].read).toBe(true);
  });

  it("markAsRead returns false for wrong user (ownership check)", async () => {
    const otherUserRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["other@test.com", "Other"],
    );

    const notif = await createNotification({
      userId,
      type: NotificationType.REVIEW_POSTED,
    });

    const result = await markAsRead(notif.id, otherUserRes.rows[0].id);
    expect(result).toBe(false);
  });

  it("markAllAsRead marks all unread notifications", async () => {
    await createNotification({ userId, type: NotificationType.EVENT_RSVP });
    await createNotification({ userId, type: NotificationType.FOLLOW_NEW });

    const count = await markAllAsRead(userId);
    expect(count).toBe(2);

    const unread = await getUnreadCount(userId);
    expect(unread).toBe(0);
  });

  it("getUnreadCount returns count of unread notifications", async () => {
    await createNotification({ userId, type: NotificationType.EVENT_RSVP });
    await createNotification({ userId, type: NotificationType.FOLLOW_NEW });
    const notif = await createNotification({ userId, type: NotificationType.REVIEW_POSTED });
    await markAsRead(notif.id, userId);

    const count = await getUnreadCount(userId);
    expect(count).toBe(2);
  });

  it("deleteNotificationsForUser removes all notifications", async () => {
    await createNotification({ userId, type: NotificationType.EVENT_RSVP });
    await createNotification({ userId, type: NotificationType.FOLLOW_NEW });

    await deleteNotificationsForUser(userId);

    const { total } = await getNotificationsForUser(userId);
    expect(total).toBe(0);
  });
});
