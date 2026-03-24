import { NextResponse } from "next/server";
import type { HealthResponse } from "@acroyoga/shared";

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const response: HealthResponse = {
    status: "healthy",
    version: process.env.COMMIT_SHA || "local",
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status: 200 });
}
