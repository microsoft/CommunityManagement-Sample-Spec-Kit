import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { submitReport, getReportQueue, reviewReport } from "@/lib/safety/reports";
import fs from "fs";
import path from "path";

let db: PGlite;
let userAId: string;
let userBId: string;
let adminId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

describe("Reports", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const r1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('alice@test.com', 'Alice') RETURNING id",
    );
    userAId = r1.rows[0].id;
    const r2 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('bob@test.com', 'Bob') RETURNING id",
    );
    userBId = r2.rows[0].id;
    const r3 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('admin@test.com', 'Admin') RETURNING id",
    );
    adminId = r3.rows[0].id;
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  describe("submitReport", () => {
    it("should submit a report", async () => {
      const result = await submitReport(userAId, userBId, "harassment", "Being rude");
      expect(result.reportId).toBeDefined();
      expect(result.status).toBe("pending");
    });

    it("should not report yourself", async () => {
      await expect(submitReport(userAId, userAId, "spam")).rejects.toThrow("Cannot report yourself");
    });

    it("should submit reports with different reasons", async () => {
      const r1 = await submitReport(userAId, userBId, "spam");
      const r2 = await submitReport(userAId, userBId, "inappropriate");
      expect(r1.reportId).not.toBe(r2.reportId);
    });
  });

  describe("getReportQueue", () => {
    it("should list all pending reports", async () => {
      await submitReport(userAId, userBId, "harassment");
      await submitReport(userBId, userAId, "spam");
      const queue = await getReportQueue();
      expect(queue.total).toBe(2);
      expect(queue.reports).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const r = await submitReport(userAId, userBId, "harassment");
      await reviewReport(r.reportId, adminId, "reviewed");
      await submitReport(userBId, userAId, "spam");
      const pending = await getReportQueue("pending");
      expect(pending.total).toBe(1);
      const reviewed = await getReportQueue("reviewed");
      expect(reviewed.total).toBe(1);
    });

    it("should paginate reports", async () => {
      await submitReport(userAId, userBId, "harassment");
      await submitReport(userBId, userAId, "spam");
      const page1 = await getReportQueue(undefined, 1, 1);
      expect(page1.reports).toHaveLength(1);
      expect(page1.total).toBe(2);
    });
  });

  describe("reviewReport", () => {
    it("should review a report", async () => {
      const r = await submitReport(userAId, userBId, "harassment");
      const reviewed = await reviewReport(r.reportId, adminId, "reviewed");
      expect(reviewed!.status).toBe("reviewed");
      expect(reviewed!.reviewedBy).toBe(adminId);
    });

    it("should action a report", async () => {
      const r = await submitReport(userAId, userBId, "spam");
      const actioned = await reviewReport(r.reportId, adminId, "actioned");
      expect(actioned!.status).toBe("actioned");
    });

    it("should dismiss a report", async () => {
      const r = await submitReport(userAId, userBId, "other");
      const dismissed = await reviewReport(r.reportId, adminId, "dismissed");
      expect(dismissed!.status).toBe("dismissed");
    });

    it("should return null for non-existent report", async () => {
      const result = await reviewReport("00000000-0000-0000-0000-999999999999", adminId, "reviewed");
      expect(result).toBeNull();
    });
  });
});
