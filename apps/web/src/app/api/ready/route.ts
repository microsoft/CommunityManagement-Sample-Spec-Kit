import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import type { ReadinessResponse } from "@acroyoga/shared";

const CHECK_TIMEOUT_MS = 5000;

function withTimeout(promise: Promise<string>): Promise<string> {
  return Promise.race([
    promise,
    new Promise<string>((resolve) =>
      setTimeout(() => resolve("error: health check timeout"), CHECK_TIMEOUT_MS),
    ),
  ]);
}

async function checkDatabase(): Promise<string> {
  try {
    await db().query("SELECT 1");
    return "ok";
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

async function checkStorage(): Promise<string> {
  const storageUrl = process.env.AZURE_STORAGE_ACCOUNT_URL;
  if (!storageUrl) {
    return "ok"; // Storage not configured — not a failure in dev/test
  }
  try {
    const credential = new DefaultAzureCredential({
      managedIdentityClientId: process.env.AZURE_CLIENT_ID,
    });
    const client = new BlobServiceClient(storageUrl, credential);
    const containerClient = client.getContainerClient("media");
    await containerClient.getProperties();
    return "ok";
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

export async function GET(): Promise<NextResponse<ReadinessResponse>> {
  const [databaseStatus, storageStatus] = await Promise.all([
    withTimeout(checkDatabase()),
    withTimeout(checkStorage()),
  ]);

  const allOk = databaseStatus === "ok" && storageStatus === "ok";
  const response: ReadinessResponse = {
    status: allOk ? "ready" : "not_ready",
    checks: {
      database: databaseStatus,
      storage: storageStatus,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: allOk ? 200 : 503 });
}
