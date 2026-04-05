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

// ─── pg-boss queue (production) ──────────────────────────

/**
 * Production job queue backed by pg-boss.
 * Uses the same PostgreSQL database as the application (via DATABASE_URL).
 * pg-boss manages its own schema tables (job, schedule, archive).
 */
export class PgBossJobQueue implements JobQueue {
  private boss: import("pg-boss") | null = null;
  private handlers = new Map<JobType, JobHandler>();
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async start(): Promise<void> {
    const PgBoss = (await import("pg-boss")).default;
    this.boss = new PgBoss({
      connectionString: this.connectionString,
      // Archive completed jobs after 7 days
      archiveCompletedAfterSeconds: 7 * 24 * 60 * 60,
      // Delete archived jobs after 30 days
      deleteAfterDays: 30,
    });

    this.boss.on("error", (err) => {
      console.error("pg-boss error:", err);
    });

    await this.boss.start();
  }

  async enqueue(type: JobType, payload: JobPayload, options?: EnqueueOptions): Promise<string> {
    if (!this.boss) throw new Error("PgBossJobQueue not started");

    const sendOptions: Record<string, unknown> = {};
    if (options?.deduplicationKey) {
      sendOptions.singletonKey = options.deduplicationKey;
    }
    if (options?.startAfterSeconds) {
      sendOptions.startAfter = options.startAfterSeconds;
    }
    if (options?.retryLimit !== undefined) {
      sendOptions.retryLimit = options.retryLimit;
    }
    if (options?.expireInSeconds !== undefined) {
      sendOptions.expireInSeconds = options.expireInSeconds;
    }

    const id = await this.boss.send(type, payload as object, sendOptions);
    return id ?? crypto.randomUUID();
  }

  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async startProcessing(): Promise<void> {
    if (!this.boss) throw new Error("PgBossJobQueue not started");

    for (const [type, handler] of this.handlers.entries()) {
      // Ensure the queue exists before subscribing
      await this.boss.createQueue(type).catch(() => {
        /* queue already exists — ignore */
      });

      await this.boss.work(type, async (jobs) => {
        for (const job of jobs) {
          await handler(job.data as JobPayload);
        }
      });
    }
  }

  async stop(): Promise<void> {
    if (this.boss) {
      await this.boss.stop({ graceful: true, timeout: 30_000 });
      this.boss = null;
    }
  }
}

// ─── Singleton ───────────────────────────────────────────

let queueInstance: JobQueue | null = null;

/** Get or create the job queue singleton */
export function getQueue(): JobQueue {
  if (!queueInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString && process.env.NODE_ENV === "production") {
      // In production, use pg-boss with the same PostgreSQL database
      queueInstance = new PgBossJobQueue(connectionString);
    } else {
      // In development/test, use the in-memory fallback
      queueInstance = new MemoryJobQueue();
    }
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
