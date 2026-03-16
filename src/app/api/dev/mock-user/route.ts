import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  SAMPLE_USERS,
  ANONYMOUS_SLUG,
  findUserBySlug,
  isMockAuthEnabled,
} from "@/lib/auth/mock-users";
import { badRequest, notFound } from "@/lib/errors";

const SetMockUserSchema = z.object({
  slug: z.string().min(1),
});

// GET /api/dev/mock-user — returns active user and available list
export async function GET(req: NextRequest) {
  if (!isMockAuthEnabled()) {
    return notFound("Not available in production");
  }

  const cookieStore = req.cookies;
  const mockCookie = cookieStore.get("mock-user-id");

  let activeUser: {
    id: string;
    slug: string;
    name: string;
    displayRole: string;
  } | null = null;

  if (mockCookie?.value && mockCookie.value !== "anonymous") {
    const user = SAMPLE_USERS.find((u) => u.id === mockCookie.value);
    if (user) {
      activeUser = {
        id: user.id,
        slug: user.slug,
        name: user.name,
        displayRole: user.displayRole,
      };
    }
  }

  // If no cookie set, default user is active
  if (!mockCookie && !activeUser) {
    const defaultUser = SAMPLE_USERS[0];
    activeUser = {
      id: defaultUser.id,
      slug: defaultUser.slug,
      name: defaultUser.name,
      displayRole: defaultUser.displayRole,
    };
  }

  const availableUsers = [
    ...SAMPLE_USERS.map((u) => ({
      id: u.id as string | null,
      slug: u.slug,
      name: u.name,
      displayRole: u.displayRole,
    })),
    {
      id: null,
      slug: ANONYMOUS_SLUG,
      name: "Anonymous / Visitor",
      displayRole: "Visitor",
    },
  ];

  return NextResponse.json({ activeUser, availableUsers });
}

// POST /api/dev/mock-user — switch active user
export async function POST(req: NextRequest) {
  if (!isMockAuthEnabled()) {
    return notFound("Not available in production");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = SetMockUserSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { slug } = parsed.data;

  // Handle anonymous
  if (slug === ANONYMOUS_SLUG) {
    const response = NextResponse.json({ activeUser: null });
    response.cookies.set("mock-user-id", "anonymous", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  }

  const user = findUserBySlug(slug);
  if (!user) {
    return badRequest(`Unknown user slug: ${slug}`);
  }

  const activeUser = {
    id: user.id,
    slug: user.slug,
    name: user.name,
    displayRole: user.displayRole,
  };

  const response = NextResponse.json({ activeUser });
  response.cookies.set("mock-user-id", user.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
