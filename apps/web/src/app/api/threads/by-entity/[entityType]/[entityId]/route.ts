import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getOrCreateThread } from "@/lib/threads/service";
import type { ThreadEntityType } from "@acroyoga/shared/types/community";

const VALID_ENTITY_TYPES = new Set(["event", "city", "country"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> },
) {
  const { entityType, entityId } = await params;
  if (!VALID_ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  const session = await getServerSession();
  const thread = await getOrCreateThread(entityType as ThreadEntityType, entityId);
  return NextResponse.json({ thread, authenticated: !!session });
}
