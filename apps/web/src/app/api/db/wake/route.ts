import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import type { DbWakeAvailableResponse, DbWakeResponse } from "@acroyoga/shared";
import { forbidden } from "@/lib/errors";

/**
 * Returns whether the database wake feature is available in this environment.
 * Wake is only available when Azure infrastructure env vars are configured AND
 * the environment is not production (staging only).
 */
export async function GET(): Promise<NextResponse<DbWakeAvailableResponse>> {
  const isConfigured =
    !!process.env.AZURE_SUBSCRIPTION_ID &&
    !!process.env.AZURE_RESOURCE_GROUP &&
    !!process.env.PGHOST;
  const isNonProduction = process.env.ENVIRONMENT_NAME !== "production";

  return NextResponse.json({ available: isConfigured && isNonProduction });
}

/**
 * Triggers an Azure PostgreSQL Flexible Server start via the ARM API.
 * Uses the Managed Identity (custom role: DB Wake — start + read only).
 * Only available in non-production environments.
 */
export async function POST(): Promise<NextResponse> {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const pgHost = process.env.PGHOST;
  const environmentName = process.env.ENVIRONMENT_NAME;

  if (environmentName === "production") {
    return forbidden("Database wake is not available in production");
  }

  if (!subscriptionId || !resourceGroup || !pgHost) {
    return NextResponse.json(
      {
        error:
          "Azure configuration not available — AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, and PGHOST must be set",
      },
      { status: 503 },
    );
  }

  // Derive server name from FQDN
  // e.g. "psql-acro-staging-xxxx.postgres.database.azure.com" → "psql-acro-staging-xxxx"
  const serverName = pgHost.split(".")[0];

  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID,
  });

  let token: string;
  try {
    const tokenResponse = await credential.getToken(
      "https://management.azure.com/.default",
    );
    token = tokenResponse.token;
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to acquire Azure management token",
        details: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }

  const armUrl =
    `https://management.azure.com/subscriptions/${subscriptionId}` +
    `/resourceGroups/${resourceGroup}` +
    `/providers/Microsoft.DBforPostgreSQL/flexibleServers/${serverName}` +
    `/start?api-version=2023-12-01-preview`;

  let armResponse: Response;
  try {
    armResponse = await fetch(armUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to reach Azure Management API",
        details: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }

  // 202 Accepted — start operation queued
  if (armResponse.status === 202) {
    const response: DbWakeResponse = { status: "starting" };
    return NextResponse.json(response, { status: 202 });
  }

  // 409 Conflict — server is already running (or another operation in progress)
  if (armResponse.status === 409) {
    const response: DbWakeResponse = { status: "already_running" };
    return NextResponse.json(response, { status: 200 });
  }

  const body = await armResponse.text();
  return NextResponse.json(
    { error: "Failed to start database server", details: body },
    { status: armResponse.status },
  );
}

