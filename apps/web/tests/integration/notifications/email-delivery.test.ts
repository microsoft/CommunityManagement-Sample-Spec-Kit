import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { createTestDb } from "../../helpers/db";
import { clearQueue, MemoryJobQueue, setTestQueue } from "@/lib/jobs/queue";
import { NotificationType, NotificationChannel } from "@acroyoga/shared/types/notifications";
import { deliverNotification } from "@/lib/notifications/delivery";
import { JobType, type SendNotificationPayload } from "@/lib/jobs/types";
import { updatePreference } from "@/lib/notifications/preferences";

// Mock the email client
vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

let pg: PGlite;
let testQueue: MemoryJobQueue;

describe("Email Delivery", () => {
  let userId: string;

  beforeEach(async () => {
    pg = await createTestDb();
    setTestDb(pg);
    testQueue = new MemoryJobQueue();
    setTestQueue(testQueue);

    const userRes = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["email-test@test.com", "Email Test"],
    );
    userId = userRes.rows[0].id;
  });

  afterEach(() => {
    clearTestDb();
    clearQueue();
    vi.clearAllMocks();
  });

  it("sends email when email channel is enabled (default)", async () => {
    const { sendEmail } = await import("@/lib/email/client");

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId,
      notificationType: NotificationType.EVENT_RSVP,
      title: "New RSVP",
      body: "Someone RSVPed",
    };

    await deliverNotification(payload);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "email-test@test.com",
        subject: "New RSVP",
      }),
    );
  });

  it("does not send email when user has disabled email for this type", async () => {
    const { sendEmail } = await import("@/lib/email/client");

    // Disable email for this notification type
    await updatePreference(userId, NotificationType.FOLLOW_NEW, NotificationChannel.EMAIL, false);

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId,
      notificationType: NotificationType.FOLLOW_NEW,
      title: "New follower",
    };

    await deliverNotification(payload);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("email includes unsubscribe link", async () => {
    const { sendEmail } = await import("@/lib/email/client");

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId,
      notificationType: NotificationType.REVIEW_POSTED,
      title: "New review",
      body: "You got reviewed",
    };

    await deliverNotification(payload);

    expect(sendEmail).toHaveBeenCalled();
    const callArgs = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.html).toContain("unsubscribe");
    expect(callArgs.html).toContain("/api/unsubscribe");
  });

  it("constructs email with correct subject and body", async () => {
    const { sendEmail } = await import("@/lib/email/client");

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId,
      notificationType: NotificationType.EVENT_CANCELLATION,
      title: "Event Cancelled",
      body: "The Wednesday Jam has been cancelled",
    };

    await deliverNotification(payload);

    const callArgs = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.subject).toBe("Event Cancelled");
    expect(callArgs.html).toContain("Event Cancelled");
    expect(callArgs.html).toContain("The Wednesday Jam has been cancelled");
  });

  it("skips email when user does not exist in database", async () => {
    const { sendEmail } = await import("@/lib/email/client");

    // Use a non-existent user ID (not the seeded deleted-user sentinel)
    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      notificationType: NotificationType.EVENT_RSVP,
      title: "New RSVP",
      body: "Someone RSVPed",
    };

    // Should not throw — gracefully skips email when user is not found
    await deliverNotification(payload);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("includes action URL when resourceType and resourceId are provided", async () => {
    const { sendEmail } = await import("@/lib/email/client");

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId,
      notificationType: NotificationType.EVENT_RSVP,
      title: "New RSVP",
      body: "Someone RSVPed to your event",
      resourceType: "event",
      resourceId: "abc-123",
    };

    await deliverNotification(payload);

    expect(sendEmail).toHaveBeenCalled();
    const callArgs = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.html).toContain("events/abc-123");
  });
});
