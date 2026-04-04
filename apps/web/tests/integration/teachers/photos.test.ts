/**
 * Integration tests for /api/teachers/[id]/photos — Teacher photo CRUD
 *
 * Tests:
 * - GET returns photos for a teacher profile
 * - POST adds a photo (auth required)
 * - POST validates Zod schema (invalid URL)
 * - POST enforces max 10 photo limit
 * - DELETE removes a photo (auth required)
 * - DELETE returns 404 for non-existent photo
 * - 401 for unauthenticated POST/DELETE
 *
 * Constitution II (Test-First), IV (Server-Side Authority)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import fs from "fs";
import path from "path";

// Mock getServerSession
vi.mock("@/lib/auth/session", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "@/lib/auth/session";
const mockGetServerSession = vi.mocked(getServerSession);

let pg: PGlite;
let userId: string;
let profileId: string;

async function applyMigrations(d: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await d.exec(sql);
  }
}

describe("Teacher Photos API", () => {
  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);

    const u = await pg.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('teacher@test.com', 'Test Teacher') RETURNING id",
    );
    userId = u.rows[0].id;

    const p = await pg.query<{ id: string }>(
      `INSERT INTO teacher_profiles (user_id, bio, specialties, badge_status)
       VALUES ($1, 'A great teacher', $2, 'verified')
       RETURNING id`,
      [userId, ["washing_machines"]],
    );
    profileId = p.rows[0].id;

    mockGetServerSession.mockResolvedValue({ userId });
  });

  afterEach(async () => {
    clearTestDb();
    vi.resetAllMocks();
    await pg.close();
  });

  // --- GET /api/teachers/[id]/photos ---
  describe("GET /api/teachers/[id]/photos", () => {
    it("returns empty array when no photos exist", async () => {
      const { GET } = await import("@/app/api/teachers/[id]/photos/route");
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos`,
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: profileId }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual([]);
    });

    it("returns photos in sort order", async () => {
      await pg.query(
        "INSERT INTO teacher_photos (teacher_profile_id, url, sort_order) VALUES ($1, $2, 1)",
        [profileId, "https://example.com/b.jpg"],
      );
      await pg.query(
        "INSERT INTO teacher_photos (teacher_profile_id, url, sort_order) VALUES ($1, $2, 0)",
        [profileId, "https://example.com/a.jpg"],
      );

      const { GET } = await import("@/app/api/teachers/[id]/photos/route");
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos`,
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: profileId }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveLength(2);
      expect(body[0].url).toBe("https://example.com/a.jpg");
      expect(body[1].url).toBe("https://example.com/b.jpg");
    });
  });

  // --- POST /api/teachers/[id]/photos ---
  describe("POST /api/teachers/[id]/photos", () => {
    it("returns 401 for unauthenticated request", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { POST } = await import("@/app/api/teachers/[id]/photos/route");
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos`,
        {
          method: "POST",
          body: JSON.stringify({ url: "https://example.com/photo.jpg" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: profileId }),
      });

      expect(response.status).toBe(401);
    });

    it("creates a photo with auto-incremented sort order", async () => {
      const { POST } = await import("@/app/api/teachers/[id]/photos/route");
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos`,
        {
          method: "POST",
          body: JSON.stringify({ url: "https://example.com/new.jpg" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: profileId }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.url).toBe("https://example.com/new.jpg");
      expect(body.sort_order).toBe(0);
      expect(body.id).toBeDefined();
    });

    it("creates a photo with explicit display_order", async () => {
      const { POST } = await import("@/app/api/teachers/[id]/photos/route");
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos`,
        {
          method: "POST",
          body: JSON.stringify({
            url: "https://example.com/ordered.jpg",
            display_order: 5,
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: profileId }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.sort_order).toBe(5);
    });

    it("returns 400 for invalid URL", async () => {
      const { POST } = await import("@/app/api/teachers/[id]/photos/route");
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos`,
        {
          method: "POST",
          body: JSON.stringify({ url: "not-a-url" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: profileId }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 when max 10 photos reached", async () => {
      // Insert 10 photos
      for (let i = 0; i < 10; i++) {
        await pg.query(
          "INSERT INTO teacher_photos (teacher_profile_id, url, sort_order) VALUES ($1, $2, $3)",
          [profileId, `https://example.com/photo${i}.jpg`, i],
        );
      }

      const { POST } = await import("@/app/api/teachers/[id]/photos/route");
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos`,
        {
          method: "POST",
          body: JSON.stringify({ url: "https://example.com/11th.jpg" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: profileId }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Maximum 10");
    });
  });

  // --- DELETE /api/teachers/[id]/photos/[photoId] ---
  describe("DELETE /api/teachers/[id]/photos/[photoId]", () => {
    it("returns 401 for unauthenticated request", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { DELETE } = await import(
        "@/app/api/teachers/[id]/photos/[photoId]/route"
      );
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos/some-id`,
        { method: "DELETE" },
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ id: profileId, photoId: "some-id" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 404 for non-existent photo", async () => {
      const { DELETE } = await import(
        "@/app/api/teachers/[id]/photos/[photoId]/route"
      );
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos/00000000-0000-0000-0000-000000000000`,
        { method: "DELETE" },
      );
      const response = await DELETE(request, {
        params: Promise.resolve({
          id: profileId,
          photoId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      expect(response.status).toBe(404);
    });

    it("deletes an existing photo", async () => {
      const photo = await pg.query<{ id: string }>(
        "INSERT INTO teacher_photos (teacher_profile_id, url, sort_order) VALUES ($1, $2, 0) RETURNING id",
        [profileId, "https://example.com/delete-me.jpg"],
      );
      const photoId = photo.rows[0].id;

      const { DELETE } = await import(
        "@/app/api/teachers/[id]/photos/[photoId]/route"
      );
      const { NextRequest } = await import("next/server");
      const request = new NextRequest(
        `http://localhost/api/teachers/${profileId}/photos/${photoId}`,
        { method: "DELETE" },
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ id: profileId, photoId }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      // Verify deleted from DB
      const remaining = await pg.query(
        "SELECT id FROM teacher_photos WHERE id = $1",
        [photoId],
      );
      expect(remaining.rows).toHaveLength(0);
    });
  });
});
