import { NextResponse } from "next/server";
import { isMockAuthEnabled } from "@/lib/auth/mock-users";
import { seedMockUsers } from "@/lib/auth/mock-seed";
import { notFound } from "@/lib/errors";

// GET /api/dev/mock-user/seed — trigger idempotent seed
export async function GET() {
  if (!isMockAuthEnabled()) {
    return notFound("Not available in production");
  }

  const result = await seedMockUsers();
  return NextResponse.json(result);
}
