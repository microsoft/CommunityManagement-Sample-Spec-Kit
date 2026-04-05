// Job worker — Spec 015
//
// Registers handlers for each job type and starts the processing loop.
// In production, this runs as a separate sidecar process via scripts/start-worker.ts.

import { type JobQueue, type JobHandler, getQueue } from "./queue";
import { JobType, type JobPayload, type SendNotificationPayload, type SendEmailPayload } from "./types";

// ─── Handler registry ────────────────────────────────────

const handlers = new Map<JobType, JobHandler>();

/** Register a handler for a job type */
export function registerHandler(type: JobType, handler: JobHandler): void {
  handlers.set(type, handler);
}

/** Get all registered handlers */
export function getHandlers(): Map<JobType, JobHandler> {
  return new Map(handlers);
}

// ─── Default handlers ────────────────────────────────────

async function handleSendNotification(payload: JobPayload): Promise<void> {
  const data = payload as SendNotificationPayload;
  // Delivery is handled by the notification service's createNotification()
  // This handler is for additional async delivery channels (email, push, etc.)
  const { deliverNotification } = await import("@/lib/notifications/delivery");
  await deliverNotification(data);
}

async function handleSendEmail(payload: JobPayload): Promise<void> {
  const data = payload as SendEmailPayload;
  const { deliverEmail } = await import("@/lib/notifications/delivery");
  await deliverEmail(data);
}

// ─── Worker lifecycle ────────────────────────────────────

/**
 * Register all default job handlers on the given queue.
 */
export function registerDefaultHandlers(queue: JobQueue): void {
  queue.registerHandler(JobType.SEND_NOTIFICATION, handleSendNotification);
  queue.registerHandler(JobType.SEND_EMAIL, handleSendEmail);
}

/**
 * Start the worker: register handlers and begin processing.
 */
export async function startWorker(): Promise<JobQueue> {
  const queue = getQueue();
  await queue.start();
  registerDefaultHandlers(queue);
  await queue.startProcessing();
  return queue;
}
