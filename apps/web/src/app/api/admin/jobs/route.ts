// GET /api/admin/jobs — Job queue dashboard
//
// Returns queue health metrics: pending count, active count, failure rate.
// Protected by permission check — requires viewAdminPanel at global scope.

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/permissions/middleware";
import { getQueue, MemoryJobQueue } from "@/lib/jobs/queue";

export const GET = withPermission("viewAdminPanel", () => ({
  scopeType: "global" as const,
  scopeValue: null,
}))(async (_req: NextRequest) => {
  const queue = getQueue();

  // For MemoryJobQueue, we can inspect the jobs directly
  if (queue instanceof MemoryJobQueue) {
    const jobs = queue.getJobs();
    const pending = jobs.filter((j) => j.status === "pending").length;
    const active = jobs.filter((j) => j.status === "active").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const total = jobs.length;

    return NextResponse.json({
      queue: {
        pending,
        active,
        completed,
        failed,
        total,
        failureRate: total > 0 ? failed / total : 0,
      },
      recentErrors: jobs
        .filter((j) => j.status === "failed" && j.error)
        .slice(-10)
        .map((j) => ({
          id: j.id,
          type: j.type,
          error: j.error,
          createdAt: j.createdAt.toISOString(),
        })),
    });
  }

  // For production pg-boss queue, query pg-boss tables for metrics.
  // TODO: Implement pg-boss metrics via boss.getQueueSize() and boss.getQueues()
  // once PgBossJobQueue exposes the underlying boss instance or a stats method.
  return NextResponse.json({
    queue: {
      pending: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0,
      failureRate: 0,
    },
    recentErrors: [],
  });
});
