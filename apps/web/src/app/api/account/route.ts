import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { deleteAccount } from "@/lib/gdpr/deletion";
import { deleteAccountSchema } from "@/lib/validation/community-schemas";
import { badRequest, fromZodError } from "@/lib/errors";

export const DELETE = requireAuth(async (req, { userId }) => {
  const body = await req.json();
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await deleteAccount(userId, parsed.data.confirmation);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return badRequest((err as Error).message);
  }
});
