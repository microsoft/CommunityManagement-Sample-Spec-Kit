import { getServerSession as nextGetServerSession } from "next-auth";

export interface Session {
  userId: string;
}

export async function getServerSession(): Promise<Session | null> {
  const session = await nextGetServerSession();
  if (!session?.user?.id) return null;
  return { userId: session.user.id };
}
