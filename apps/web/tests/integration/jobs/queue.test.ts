import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryJobQueue } from "@/lib/jobs/queue";
import { JobType, type SendNotificationPayload } from "@/lib/jobs/types";
import { NotificationType } from "@acroyoga/shared/types/notifications";

describe("Job Queue — enqueue and dequeue", () => {
  let queue: MemoryJobQueue;

  beforeEach(() => {
    queue = new MemoryJobQueue();
  });

  afterEach(() => {
    queue.reset();
  });

  it("enqueues a job and returns an id", async () => {
    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-1",
      notificationType: NotificationType.EVENT_RSVP,
      title: "New RSVP",
    };

    const id = await queue.enqueue(JobType.SEND_NOTIFICATION, payload);
    expect(id).toBeTruthy();
    expect(queue.getJobs()).toHaveLength(1);
    expect(queue.getJobs()[0].status).toBe("pending");
  });

  it("worker picks up and processes a job with the registered handler", async () => {
    const processed: SendNotificationPayload[] = [];

    queue.registerHandler(JobType.SEND_NOTIFICATION, async (p) => {
      processed.push(p as SendNotificationPayload);
    });

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-2",
      notificationType: NotificationType.FOLLOW_NEW,
      title: "New follower",
    };

    await queue.enqueue(JobType.SEND_NOTIFICATION, payload);
    await queue.processAll();

    expect(processed).toHaveLength(1);
    expect(processed[0].userId).toBe("user-2");
    expect(queue.getJobs()[0].status).toBe("completed");
  });

  it("calls handler with correct payload", async () => {
    let receivedPayload: SendNotificationPayload | null = null;

    queue.registerHandler(JobType.SEND_NOTIFICATION, async (p) => {
      receivedPayload = p as SendNotificationPayload;
    });

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-3",
      notificationType: NotificationType.REVIEW_POSTED,
      title: "New review",
      body: "You got a 5-star review!",
      resourceType: "review",
      resourceId: "review-123",
    };

    await queue.enqueue(JobType.SEND_NOTIFICATION, payload);
    await queue.processAll();

    expect(receivedPayload).not.toBeNull();
    expect(receivedPayload!.notificationType).toBe(NotificationType.REVIEW_POSTED);
    expect(receivedPayload!.resourceType).toBe("review");
    expect(receivedPayload!.resourceId).toBe("review-123");
  });

  it("deduplicates jobs with the same deduplication key", async () => {
    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-4",
      notificationType: NotificationType.EVENT_RSVP,
      title: "RSVP",
    };

    const id1 = await queue.enqueue(JobType.SEND_NOTIFICATION, payload, {
      deduplicationKey: "rsvp-event-1-user-4",
    });
    const id2 = await queue.enqueue(JobType.SEND_NOTIFICATION, payload, {
      deduplicationKey: "rsvp-event-1-user-4",
    });

    expect(id1).toBe(id2);
    expect(queue.getJobs()).toHaveLength(1);
  });

  it("processes multiple jobs in order", async () => {
    const order: string[] = [];

    queue.registerHandler(JobType.SEND_NOTIFICATION, async (p) => {
      order.push((p as SendNotificationPayload).userId);
    });

    await queue.enqueue(JobType.SEND_NOTIFICATION, {
      type: JobType.SEND_NOTIFICATION,
      userId: "first",
      notificationType: NotificationType.FOLLOW_NEW,
      title: "First",
    });
    await queue.enqueue(JobType.SEND_NOTIFICATION, {
      type: JobType.SEND_NOTIFICATION,
      userId: "second",
      notificationType: NotificationType.FOLLOW_NEW,
      title: "Second",
    });

    await queue.processAll();

    expect(order).toEqual(["first", "second"]);
  });
});
