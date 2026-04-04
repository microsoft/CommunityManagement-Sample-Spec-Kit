#!/usr/bin/env tsx
// Worker entry point — Spec 015
//
// Starts the background job worker process. In production, this runs
// as a sidecar container in Azure Container Apps.
//
// Usage: npx tsx scripts/start-worker.ts

import { startWorker } from "../apps/web/src/lib/jobs/worker";

async function main() {
  console.log("[worker] Starting background job worker…");

  const queue = await startWorker();

  // Graceful shutdown on SIGTERM/SIGINT
  const shutdown = async () => {
    console.log("[worker] Shutting down…");
    await queue.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log("[worker] Worker running. Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
