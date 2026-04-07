import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TeacherProfileDetail } from "@acroyoga/shared/types/teachers";

function makeTeacher(
  overrides: Partial<TeacherProfileDetail> = {},
): TeacherProfileDetail {
  return {
    id: "tp-001",
    user_id: "u1",
    bio: "Experienced AcroYoga teacher.",
    specialties: ["therapeutic", "performance"],
    badge_status: "verified",
    aggregate_rating: "4.8",
    review_count: 12,
    is_deleted: false,
    deleted_at: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    user_name: "Alice Smith",
    user_email: "alice@example.com",
    certifications: [],
    photos: [
      {
        id: "p1",
        teacher_profile_id: "tp-001",
        url: "https://example.com/avatar.jpg",
        sort_order: 0,
        created_at: "2026-01-01",
      },
    ],
    upcoming_event_count: 3,
    past_event_count: 10,
    ...overrides,
  };
}

// Mock getTeacherProfile at module level
const mockGetTeacherProfile = vi.fn<(id: string) => Promise<TeacherProfileDetail | null>>();
vi.mock("@/lib/teachers/profiles", () => ({
  getTeacherProfile: (...args: unknown[]) => mockGetTeacherProfile(args[0] as string),
}));

const { GET } = await import("@/app/api/og/teachers/[id]/route");

describe("OG teachers image route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-existent teacher", async () => {
    mockGetTeacherProfile.mockResolvedValue(null);
    const req = new Request("http://localhost/api/og/teachers/missing");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for deleted teacher", async () => {
    mockGetTeacherProfile.mockResolvedValue(makeTeacher({ is_deleted: true }));
    const req = new Request("http://localhost/api/og/teachers/tp-001");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "tp-001" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with image content-type for active teacher", async () => {
    mockGetTeacherProfile.mockResolvedValue(makeTeacher());
    const req = new Request("http://localhost/api/og/teachers/tp-001");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "tp-001" }),
    });
    expect(res.status).toBe(200);
    const ct = res.headers.get("content-type");
    expect(ct).toContain("image/png");
  });

  it("renders without error when teacher has no photo", async () => {
    mockGetTeacherProfile.mockResolvedValue(makeTeacher({ photos: [] }));
    const req = new Request("http://localhost/api/og/teachers/tp-001");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "tp-001" }),
    });
    expect(res.status).toBe(200);
  });

  it("sets Cache-Control header", async () => {
    mockGetTeacherProfile.mockResolvedValue(makeTeacher());
    const req = new Request("http://localhost/api/og/teachers/tp-001");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "tp-001" }),
    });
    const cc = res.headers.get("cache-control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=86400");
  });
});
