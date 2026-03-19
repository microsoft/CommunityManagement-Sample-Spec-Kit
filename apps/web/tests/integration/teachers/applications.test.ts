import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  submitApplication,
  listPendingRequests,
  getRequest,
  approveRequest,
  rejectRequest,
} from "@/lib/teachers/applications";
import fs from "fs";
import path from "path";

let db: PGlite;
let userId: string;
let adminId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

describe("Teacher Applications", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const u1 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('teacher@test.com', 'Teacher') RETURNING id",
    );
    userId = u1.rows[0].id;

    const u2 = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('admin@test.com', 'Admin') RETURNING id",
    );
    adminId = u2.rows[0].id;
  }, 30000);

  afterEach(async () => {
    clearTestDb();
    await db.close();
  }, 30000);

  describe("submitApplication", () => {
    it("should submit a basic application", async () => {
      const result = await submitApplication(userId, {
        bio: "Experienced teacher",
        specialties: ["washing_machines", "hand_to_hand"],
        credentials: [
          { name: "AcroYoga Cert", issuingBody: "AcroYoga International" },
        ],
      });
      expect(result.id).toBeDefined();
      expect(result.status).toBe("pending");
      expect(result.user_id).toBe(userId);
      expect(result.specialties).toEqual(["washing_machines", "hand_to_hand"]);
    });

    it("should reject duplicate pending application", async () => {
      await submitApplication(userId, {
        specialties: ["flow"],
        credentials: [{ name: "Cert 1", issuingBody: "Org 1" }],
      });
      await expect(
        submitApplication(userId, {
          specialties: ["flow"],
          credentials: [{ name: "Cert 2", issuingBody: "Org 2" }],
        }),
      ).rejects.toThrow("already has a pending");
    });

    it("should reject if user already has a teacher profile", async () => {
      await db.query(
        `INSERT INTO teacher_profiles (user_id, specialties) VALUES ($1, $2)`,
        [userId, ["flow"]],
      );
      await expect(
        submitApplication(userId, {
          specialties: ["flow"],
          credentials: [{ name: "C", issuingBody: "O" }],
        }),
      ).rejects.toThrow("already has a teacher profile");
    });
  });

  describe("listPendingRequests", () => {
    it("should return pending requests with pagination", async () => {
      const user2 = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('t2@test.com', 'T2') RETURNING id",
      );
      await submitApplication(userId, {
        specialties: ["flow"],
        credentials: [{ name: "C1", issuingBody: "O1" }],
      });
      await submitApplication(user2.rows[0].id, {
        specialties: ["icarian"],
        credentials: [{ name: "C2", issuingBody: "O2" }],
      });

      const result = await listPendingRequests(1, 10);
      expect(result.total).toBe(2);
      expect(result.requests).toHaveLength(2);
    });

    it("should not return approved/rejected requests", async () => {
      const app = await submitApplication(userId, {
        specialties: ["flow"],
        credentials: [{ name: "C", issuingBody: "O" }],
      });
      await approveRequest(app.id, adminId);

      const result = await listPendingRequests();
      expect(result.total).toBe(0);
    });
  });

  describe("getRequest", () => {
    it("should return a specific request", async () => {
      const app = await submitApplication(userId, {
        specialties: ["flow"],
        credentials: [{ name: "C", issuingBody: "O" }],
      });

      const result = await getRequest(app.id);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(app.id);
    });

    it("should return null for non-existent request", async () => {
      const result = await getRequest("00000000-0000-0000-0000-000000000000");
      expect(result).toBeNull();
    });
  });

  describe("approveRequest", () => {
    it("should approve and create teacher profile + certifications", async () => {
      const app = await submitApplication(userId, {
        bio: "My bio",
        specialties: ["washing_machines"],
        credentials: [
          { name: "AcroYoga Teacher", issuingBody: "International AcroYoga", expiryDate: "2026-06-01" },
          { name: "First Aid", issuingBody: "Red Cross" },
        ],
      });

      const approved = await approveRequest(app.id, adminId);
      expect(approved!.status).toBe("approved");
      expect(approved!.reviewed_by).toBe(adminId);

      // Verify profile created
      const profile = await db.query<{ id: string; bio: string; badge_status: string }>(
        `SELECT * FROM teacher_profiles WHERE user_id = $1`, [userId],
      );
      expect(profile.rows).toHaveLength(1);
      expect(profile.rows[0].bio).toBe("My bio");
      expect(profile.rows[0].badge_status).toBe("verified");

      // Verify certifications created
      const certs = await db.query<{ name: string; status: string }>(
        `SELECT * FROM certifications WHERE teacher_profile_id = $1 ORDER BY name`,
        [profile.rows[0].id],
      );
      expect(certs.rows).toHaveLength(2);
      expect(certs.rows[0].name).toBe("AcroYoga Teacher");
      expect(certs.rows[0].status).toBe("verified");
      expect(certs.rows[1].name).toBe("First Aid");
    });

    it("should not approve an already-approved request", async () => {
      const app = await submitApplication(userId, {
        specialties: [],
        credentials: [{ name: "C", issuingBody: "O" }],
      });
      await approveRequest(app.id, adminId);
      await expect(approveRequest(app.id, adminId)).rejects.toThrow("Cannot approve");
    });
  });

  describe("rejectRequest", () => {
    it("should reject with reason", async () => {
      const app = await submitApplication(userId, {
        specialties: [],
        credentials: [{ name: "C", issuingBody: "O" }],
      });

      const rejected = await rejectRequest(app.id, adminId, "Insufficient credentials");
      expect(rejected!.status).toBe("rejected");
      expect(rejected!.rejection_reason).toBe("Insufficient credentials");
    });

    it("should not reject an already-rejected request", async () => {
      const app = await submitApplication(userId, {
        specialties: [],
        credentials: [{ name: "C", issuingBody: "O" }],
      });
      await rejectRequest(app.id, adminId);
      await expect(rejectRequest(app.id, adminId)).rejects.toThrow("Cannot reject");
    });
  });
});
