import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "../helpers/db";
import { setTestDb, clearTestDb } from "../../src/lib/db/client";
import type { PGlite } from "@electric-sql/pglite";

// Dynamic import for route handlers
const healthModule = () => import("../../src/app/api/health/route");
const readyModule = () => import("../../src/app/api/ready/route");

describe("Health API endpoints", () => {
  let testDb: PGlite;

  beforeAll(async () => {
    testDb = await createTestDb();
    setTestDb(testDb);
  });

  afterAll(() => {
    clearTestDb();
  });

  describe("GET /api/health", () => {
    it("returns 200 with status, version, and timestamp", async () => {
      const { GET } = await healthModule();
      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "healthy");
      expect(body).toHaveProperty("version");
      expect(body).toHaveProperty("timestamp");
      expect(typeof body.timestamp).toBe("string");
    });
  });

  describe("GET /api/ready", () => {
    it("returns 200 when database is reachable", async () => {
      const { GET } = await readyModule();
      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "ready");
      expect(body.checks).toHaveProperty("database", "ok");
      expect(body).toHaveProperty("timestamp");
    });

    it("returns 503 when database is unreachable", async () => {
      // Temporarily clear the test DB to simulate unreachable database
      clearTestDb();

      // Override DATABASE_URL to force pg Pool usage that will fail
      const origUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = "postgresql://invalid:invalid@localhost:1/invalid";

      const { GET } = await readyModule();
      const response = await GET();
      expect(response.status).toBe(503);

      const body = await response.json();
      expect(body).toHaveProperty("status", "not_ready");
      expect(body.checks.database).toMatch(/^error:/);

      // Restore
      if (origUrl) {
        process.env.DATABASE_URL = origUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
      setTestDb(testDb);
    });
  });
});
