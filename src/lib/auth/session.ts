import { auth } from "./config";
import {
  isMockAuthEnabled,
  DEFAULT_MOCK_USER,
  findUserById,
} from "./mock-users";

export interface Session {
  userId: string;
}

// Module-level mock user state (used by tests and dev server fallback)
let _mockUserId: string | null = null;

export function setMockUser(userId: string | null): void {
  _mockUserId = userId;
}

export function getMockUserId(): string | null {
  return _mockUserId;
}

export async function getServerSession(): Promise<Session | null> {
  if (isMockAuthEnabled()) {
    return getMockSession();
  }

  const session = await auth();
  if (!session?.user?.id) return null;
  return { userId: session.user.id };
}

function getMockSession(): Session | null {
  // Try cookie first (dev server with browser)
  let userId: string | null = null;
  try {
    // Dynamic import to avoid build errors in test environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cookies } = require("next/headers");
    const cookieStore = cookies();
    const mockCookie = cookieStore.get("mock-user-id");
    if (mockCookie?.value) {
      userId = mockCookie.value;
    }
  } catch {
    // Not in a request context (e.g., tests) — fall through to module state
  }

  // Fall back to module-level state (tests)
  if (!userId) {
    userId = _mockUserId;
  }

  // No mock user set — use default
  if (!userId) {
    userId = DEFAULT_MOCK_USER.id;
  }

  // Special sentinel for anonymous
  if (userId === "anonymous") {
    return null;
  }

  // Validate the user ID exists in sample users
  const user = findUserById(userId);
  if (!user) {
    return { userId }; // Allow arbitrary IDs for flexibility
  }

  return { userId: user.id };
}
