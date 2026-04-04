// Job queue singleton — Spec 015
//
// Provides a type-safe wrapper around pg-boss for job enqueue/processing.
// In production, uses pg-boss with a real PostgreSQL connection.
// In dev/test, uses the in-memory fallback (see queue-memory.ts).

import type { JobPayload, JobType } from "./types";

// ─── Queue interface ─────────────────────────────────────

export type JobHandler = (payload: JobPayload) => Promise<void>;

export interface JobQueue {
  /** Start the queue (connect, create schema if needed) */
  start(): Promise<void>;
  /** Enqueue a job for async processing */
  enqueue(type: JobType, payload: JobPayload, options?: EnqueueOptions): Promise<string>;
  /** Register a handler for a job type */
  registerHandler(type: JobType, handler: JobHandler): void;
  /** Begin processing registered jobs */
  startProcessing(): Promise<void>;
  /** Graceful shutdown */
  stop(): Promise<void>;
}

export interface EnqueueOptions {
  /** Deduplication key — prevents duplicate jobs with the same key */
  deduplicationKey?: string;
  /** Delay in seconds before the job becomes available for processing */
  startAfterSeconds?: number;
  /** Maximum number of retry attempts (default: 3) */
  retryLimit?: number;
  /** Use exponential backoff for retries (default: true) */
  expireInSeconds?: number;
}

// ─── In-memory queue (dev/test) ──────────────────────────

interface QueuedJob {
  id: string;
  type: JobType;
  payload: JobPayload;
  options?: EnqueueOptions;
  status: "pending" | "active" | "completed" | "failed";
  retryCount: number;
  createdAt: Date;
  error?: string;
}

let jobIdCounter = 0;

export class MemoryJobQueue implements JobQueue {
  private jobs: QueuedJob[] = [];
  private handlers = new Map<JobType, JobHandler>();
  private processing = false;

  async start(): Promise<void> {
    /* no-op for in-memory */
  }

  async enqueue(type: JobType, payload: JobPayload, options?: EnqueueOptions): Promise<string> {
    // Check deduplication key
    if (options?.deduplicationKey) {
      const existing = this.jobs.find(
        (j) =>
          j.type === type &&
          j.options?.deduplicationKey === options.deduplicationKey &&
          (j.status === "pending" || j.status === "active"),
      );
      if (existing) return existing.id;
    }

    const id = `job-${++jobIdCounter}`;
    this.jobs.push({
      id,
      type,
      payload,
      options,
      status: "pending",
      retryCount: 0,
      createdAt: new Date(),
    });
    return id;
  }

  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async startProcessing(): Promise<void> {
    this.processing = true;
    await this.processAll();
  }

  /** Process all pending jobs (useful in tests) */
  async processAll(): Promise<void> {
    const pending = this.jobs.filter((j) => j.status === "pending");
    for (const job of pending) {
      const handler = this.handlers.get(job.type);
      if (!handler) continue;

      job.status = "active";
      try {
        await handler(job.payload);
        job.status = "completed";
      } catch (err) {
        const maxRetries = job.options?.retryLimit ?? 3;
        job.retryCount++;
        if (job.retryCount >= maxRetries) {
          job.status = "failed";
          job.error = err instanceof Error ? err.message : String(err);
        } else {
          job.status = "pending"; // retry
        }
      }
    }
  }

  async stop(): Promise<void> {
    this.processing = false;
  }

  /** Test helper: get all jobs */
  getJobs(): QueuedJob[] {
    return [...this.jobs];
  }

  /** Test helper: get jobs by type */
  getJobsByType(type: JobType): QueuedJob[] {
    return this.jobs.filter((j) => j.type === type);
  }

  /** Test helper: reset queue state */
  reset(): void {
    this.jobs = [];
    this.handlers.clear();
    this.processing = false;
    jobIdCounter = 0;
  }
}

// ─── Singleton ───────────────────────────────────────────

let queueInstance: JobQueue | null = null;

/** Get or create the job queue singleton */
export function getQueue(): JobQueue {
  if (!queueInstance) {
    // In production with pg-boss, we'd check for DATABASE_URL and create PgBossJobQueue.
    // For now, always use MemoryJobQueue which works with PGlite in dev/test.
    queueInstance = new MemoryJobQueue();
  }
  return queueInstance;
}

/** Override the queue singleton (for testing) */
export function setTestQueue(queue: JobQueue): void {
  queueInstance = queue;
}

/** Clear the queue singleton */
export function clearQueue(): void {
  queueInstance = null;
}

// ─── Type-safe enqueue helper ────────────────────────────

/**
 * Enqueue a job with type-safe payload.
 * This is the primary API for services to dispatch async work.
 */
export async function enqueueJob(
  type: JobType,
  payload: JobPayload,
  options?: EnqueueOptions,
): Promise<string> {
  const queue = getQueue();
  return queue.enqueue(type, payload, options);
}
