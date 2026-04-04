import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryJobQueue } from "@/lib/jobs/queue";
import { JobType, type SendNotificationPayload } from "@/lib/jobs/types";
import { NotificationType } from "@acroyoga/shared/types/notifications";

describe("Job Queue — retry and dead-letter", () => {
  let queue: MemoryJobQueue;

  beforeEach(() => {
    queue = new MemoryJobQueue();
  });

  afterEach(() => {
    queue.reset();
  });

  it("retries a failed job up to the retry limit", async () => {
    let attempts = 0;

    queue.registerHandler(JobType.SEND_NOTIFICATION, async () => {
      attempts++;
      if (attempts < 3) throw new Error("Transient failure");
    });

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-retry",
      notificationType: NotificationType.EVENT_RSVP,
      title: "Retryable",
    };

    await queue.enqueue(JobType.SEND_NOTIFICATION, payload, { retryLimit: 3 });

    // First process: attempt 1 fails, gets re-queued
    await queue.processAll();
    expect(queue.getJobs()[0].status).toBe("pending");

    // Second process: attempt 2 fails, gets re-queued
    await queue.processAll();
    expect(queue.getJobs()[0].status).toBe("pending");

    // Third process: attempt 3 succeeds
    await queue.processAll();
    expect(queue.getJobs()[0].status).toBe("completed");
    expect(attempts).toBe(3);
  });

  it("marks job as failed after exceeding max retries", async () => {
    queue.registerHandler(JobType.SEND_NOTIFICATION, async () => {
      throw new Error("Permanent failure");
    });

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-fail",
      notificationType: NotificationType.EVENT_CANCELLATION,
      title: "Will fail",
    };

    await queue.enqueue(JobType.SEND_NOTIFICATION, payload, { retryLimit: 2 });

    // Process twice — both fail
    await queue.processAll();
    await queue.processAll();

    const job = queue.getJobs()[0];
    expect(job.status).toBe("failed");
    expect(job.retryCount).toBe(2);
    expect(job.error).toBe("Permanent failure");
  });

  it("dead-letter: failed job retains error information", async () => {
    queue.registerHandler(JobType.SEND_NOTIFICATION, async () => {
      throw new Error("Handler crashed");
    });

    const payload: SendNotificationPayload = {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-dead",
      notificationType: NotificationType.REVIEW_POSTED,
      title: "Dead letter test",
    };

    await queue.enqueue(JobType.SEND_NOTIFICATION, payload, { retryLimit: 1 });
    await queue.processAll();

    const job = queue.getJobs()[0];
    expect(job.status).toBe("failed");
    expect(job.error).toBe("Handler crashed");
  });

  it("uses default retry limit of 3 when not specified", async () => {
    let attempts = 0;

    queue.registerHandler(JobType.SEND_NOTIFICATION, async () => {
      attempts++;
      throw new Error("Always fails");
    });

    await queue.enqueue(JobType.SEND_NOTIFICATION, {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-default",
      notificationType: NotificationType.FOLLOW_NEW,
      title: "Default retries",
    });

    // Process 3 times (default retry limit)
    await queue.processAll();
    await queue.processAll();
    await queue.processAll();

    expect(attempts).toBe(3);
    expect(queue.getJobs()[0].status).toBe("failed");
  });

  it("does not retry completed jobs", async () => {
    let attempts = 0;

    queue.registerHandler(JobType.SEND_NOTIFICATION, async () => {
      attempts++;
    });

    await queue.enqueue(JobType.SEND_NOTIFICATION, {
      type: JobType.SEND_NOTIFICATION,
      userId: "user-once",
      notificationType: NotificationType.PAYMENT_RECEIVED,
      title: "One-time",
    });

    await queue.processAll();
    await queue.processAll(); // second call should not re-process

    expect(attempts).toBe(1);
    expect(queue.getJobs()[0].status).toBe("completed");
  });
});
