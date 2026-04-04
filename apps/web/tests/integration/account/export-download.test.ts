/**
 * Integration tests for GET /api/account/exports/[id]/download — GDPR export download
 *
 * Tests:
 * - 401 for unauthenticated requests
 * - 404 for non-existent export
 * - 400 for incomplete export
 * - 200 with JSON attachment for completed export
 * - Ownership check: user cannot download another user's export
 *
 * Constitution II (Test-First), III (Privacy & Data Protection)
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

// Mock GDPR export to avoid cross-module complications
vi.mock("@/lib/gdpr/export", () => ({
  exportUserData: vi.fn().mockResolvedValue({}),
}));

import { getServerSession } from "@/lib/auth/session";
const mockGetServerSession = vi.mocked(getServerSession);

let pg: PGlite;

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

async function createUser(d: PGlite, email: string): Promise<string> {
  const result = await d.query<{ id: string }>(
    "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
    [email, email.split("@")[0]],
  );
  return result.rows[0].id;
}

describe("GET /api/account/exports/[id]/download", () => {
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    pg = new PGlite();
    await applyMigrations(pg);
    setTestDb(pg);

    userId = await createUser(pg, "user@test.com");
    otherUserId = await createUser(pg, "other@test.com");
  });

  afterEach(async () => {
    clearTestDb();
    vi.resetAllMocks();
    await pg.close();
  });

  async function callDownload(
    exportId: string,
    sessionOverride?: { userId: string } | null,
  ) {
    if (sessionOverride === null) {
      mockGetServerSession.mockResolvedValue(null);
    } else if (sessionOverride) {
      mockGetServerSession.mockResolvedValue(sessionOverride);
    }

    const { GET } = await import(
      "@/app/api/account/exports/[id]/download/route"
    );
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      `http://localhost/api/account/exports/${exportId}/download`,
    );
    return GET(request, { params: Promise.resolve({ id: exportId }) });
  }

  it("returns 401 for unauthenticated request", async () => {
    const response = await callDownload("some-id", null);
    expect(response.status).toBe(401);
  });

  it("returns 404 for non-existent export", async () => {
    const response = await callDownload(
      "00000000-0000-0000-0000-000000000000",
      { userId },
    );
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toContain("not found");
  });

  it("returns 404 when accessing another user's export (ownership check)", async () => {
    // Create export for userId
    const exportResult = await pg.query<{ id: string }>(
      "INSERT INTO data_exports (user_id, status) VALUES ($1, 'completed') RETURNING id",
      [userId],
    );
    const exportId = exportResult.rows[0].id;

    // Try to access as otherUser
    const response = await callDownload(exportId, { userId: otherUserId });
    expect(response.status).toBe(404);
  });

  it("returns 400 when export is not yet completed", async () => {
    const exportResult = await pg.query<{ id: string }>(
      "INSERT INTO data_exports (user_id, status) VALUES ($1, 'pending') RETURNING id",
      [userId],
    );
    const exportId = exportResult.rows[0].id;

    const response = await callDownload(exportId, { userId });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("not yet completed");
  });

  it("returns 200 with JSON attachment for completed export", async () => {
    const exportResult = await pg.query<{ id: string }>(
      "INSERT INTO data_exports (user_id, status) VALUES ($1, 'completed') RETURNING id",
      [userId],
    );
    const exportId = exportResult.rows[0].id;

    const response = await callDownload(exportId, { userId });
    expect(response.status).toBe(200);

    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Content-Disposition")).toContain(
      `data-export-${exportId}.json`,
    );

    const text = await response.text();
    const data = JSON.parse(text);
    // Should be a valid export schema with expected keys
    expect(data).toHaveProperty("rsvps");
    expect(data).toHaveProperty("follows");
    expect(data).toHaveProperty("blocks");
    expect(data).toHaveProperty("mutes");
  });
});
