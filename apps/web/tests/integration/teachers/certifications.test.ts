import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  listCertifications,
  getCertification,
  createCertification,
  updateCertification,
  deleteCertification,
  verifyCertification,
  updateBadgeStatus,
  expireOverdueCertifications,
  listExpiringCertifications,
} from "@/lib/teachers/certifications";
import fs from "fs";
import path from "path";

let db: PGlite;
let userId: string;
let adminId: string;
let profileId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

describe("Certifications", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const u = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('teacher@test.com', 'Alice') RETURNING id",
    );
    userId = u.rows[0].id;

    const a = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('admin@test.com', 'Admin') RETURNING id",
    );
    adminId = a.rows[0].id;

    const p = await db.query<{ id: string }>(
      `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
       VALUES ($1, '{}', 'pending') RETURNING id`,
      [userId],
    );
    profileId = p.rows[0].id;
  }, 30000);

  afterEach(async () => {
    clearTestDb();
    await db.close();
  }, 30000);

  describe("CRUD", () => {
    it("should create a certification", async () => {
      const cert = await createCertification(profileId, {
        name: "AcroYoga Teacher",
        issuingBody: "AcroYoga International",
        expiryDate: "2026-06-01",
      });
      expect(cert.id).toBeDefined();
      expect(cert.name).toBe("AcroYoga Teacher");
      expect(cert.status).toBe("pending");
      expect(cert.teacher_profile_id).toBe(profileId);
    });

    it("should list certifications for a teacher", async () => {
      await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      await createCertification(profileId, { name: "C2", issuingBody: "O2" });

      const list = await listCertifications(profileId);
      expect(list).toHaveLength(2);
    });

    it("should get a single certification", async () => {
      const cert = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      const result = await getCertification(cert.id);
      expect(result).not.toBeNull();
      expect(result!.name).toBe("C1");
    });

    it("should update a certification", async () => {
      const cert = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      const updated = await updateCertification(cert.id, { name: "Updated Cert", expiryDate: "2027-01-01" });
      expect(updated!.name).toBe("Updated Cert");
      expect(updated!.expiry_date).toBeDefined();
      expect(String(updated!.expiry_date)).toContain("2027");
    });

    it("should delete a certification", async () => {
      const cert = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      expect(await deleteCertification(cert.id)).toBe(true);
      expect(await getCertification(cert.id)).toBeNull();
    });

    it("should return false when deleting non-existent cert", async () => {
      expect(await deleteCertification("00000000-0000-0000-0000-000000000000")).toBe(false);
    });
  });

  describe("verifyCertification", () => {
    it("should verify a certification", async () => {
      const cert = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      const verified = await verifyCertification(cert.id, adminId, "verified");
      expect(verified!.status).toBe("verified");
      expect(verified!.verified_by_admin_id).toBe(adminId);
      expect(verified!.verified_at).not.toBeNull();
    });

    it("should revoke a certification", async () => {
      const cert = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      const revoked = await verifyCertification(cert.id, adminId, "revoked");
      expect(revoked!.status).toBe("revoked");
    });

    it("should return null for non-existent cert", async () => {
      expect(await verifyCertification("00000000-0000-0000-0000-000000000000", adminId, "verified")).toBeNull();
    });
  });

  describe("updateBadgeStatus", () => {
    it("should set badge to verified when at least one cert is verified and none expired", async () => {
      const cert = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      await verifyCertification(cert.id, adminId, "verified");

      const profile = await db.query(`SELECT badge_status FROM teacher_profiles WHERE id = $1`, [profileId]);
      expect(profile.rows[0].badge_status).toBe("verified");
    });

    it("should set badge to expired when any cert is expired", async () => {
      const c1 = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      await verifyCertification(c1.id, adminId, "verified");
      const c2 = await createCertification(profileId, { name: "C2", issuingBody: "O2" });
      // Manually set to expired
      await db.query(`UPDATE certifications SET status = 'expired' WHERE id = $1`, [c2.id]);
      await updateBadgeStatus(profileId);

      const profile = await db.query(`SELECT badge_status FROM teacher_profiles WHERE id = $1`, [profileId]);
      expect(profile.rows[0].badge_status).toBe("expired");
    });

    it("should set badge to revoked when all certs are revoked", async () => {
      const cert = await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      await verifyCertification(cert.id, adminId, "revoked");

      const profile = await db.query(`SELECT badge_status FROM teacher_profiles WHERE id = $1`, [profileId]);
      expect(profile.rows[0].badge_status).toBe("revoked");
    });

    it("should set badge to pending when no special conditions are met", async () => {
      await createCertification(profileId, { name: "C1", issuingBody: "O1" });
      await updateBadgeStatus(profileId);

      const profile = await db.query(`SELECT badge_status FROM teacher_profiles WHERE id = $1`, [profileId]);
      expect(profile.rows[0].badge_status).toBe("pending");
    });
  });

  describe("expireOverdueCertifications", () => {
    it("should expire verified certifications past their expiry date", async () => {
      const cert = await createCertification(profileId, {
        name: "C1",
        issuingBody: "O1",
        expiryDate: "2020-01-01",
      });
      await db.query(`UPDATE certifications SET status = 'verified' WHERE id = $1`, [cert.id]);

      const count = await expireOverdueCertifications();
      expect(count).toBeGreaterThanOrEqual(1);

      const updated = await getCertification(cert.id);
      expect(updated!.status).toBe("expired");
    });

    it("should not expire certifications with future expiry date", async () => {
      const cert = await createCertification(profileId, {
        name: "C2",
        issuingBody: "O2",
        expiryDate: "2030-01-01",
      });
      await db.query(`UPDATE certifications SET status = 'verified' WHERE id = $1`, [cert.id]);

      await expireOverdueCertifications();

      const updated = await getCertification(cert.id);
      expect(updated!.status).toBe("verified");
    });
  });

  describe("listExpiringCertifications", () => {
    it("should list certifications expiring within N days", async () => {
      // Create one expiring in 10 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateStr = futureDate.toISOString().split("T")[0];

      const cert = await createCertification(profileId, {
        name: "Expiring Soon",
        issuingBody: "O1",
        expiryDate: dateStr,
      });
      await db.query(`UPDATE certifications SET status = 'verified' WHERE id = $1`, [cert.id]);

      const list = await listExpiringCertifications(30);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((c) => c.id === cert.id)).toBe(true);
    });

    it("should not list already-expired certifications", async () => {
      const cert = await createCertification(profileId, {
        name: "Already Expired",
        issuingBody: "O1",
        expiryDate: "2020-01-01",
      });
      await db.query(`UPDATE certifications SET status = 'verified' WHERE id = $1`, [cert.id]);

      const list = await listExpiringCertifications(30);
      expect(list.some((c) => c.id === cert.id)).toBe(false);
    });
  });
});
