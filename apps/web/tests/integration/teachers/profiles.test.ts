import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import {
  getTeacherProfile,
  getTeacherProfileByUserId,
  updateTeacherProfile,
  searchTeachers,
  deleteTeacherProfile,
} from "@/lib/teachers/profiles";
import fs from "fs";
import path from "path";

let db: PGlite;
let userId: string;
let profileId: string;

async function applyMigrations(pglite: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pglite.exec(sql);
  }
}

describe("Teacher Profiles", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);

    const u = await db.query<{ id: string }>(
      "INSERT INTO users (email, name) VALUES ('teacher@test.com', 'Alice Teacher') RETURNING id",
    );
    userId = u.rows[0].id;

    const p = await db.query<{ id: string }>(
      `INSERT INTO teacher_profiles (user_id, bio, specialties, badge_status)
       VALUES ($1, 'Expert AcroYoga teacher', $2, 'verified')
       RETURNING id`,
      [userId, ["washing_machines", "hand_to_hand"]],
    );
    profileId = p.rows[0].id;

    // Create a certification for profile detail tests
    await db.query(
      `INSERT INTO certifications (teacher_profile_id, name, issuing_body, status)
       VALUES ($1, 'AcroYoga Cert', 'International', 'verified')`,
      [profileId],
    );

    // Create a photo
    await db.query(
      `INSERT INTO teacher_photos (teacher_profile_id, url, sort_order) VALUES ($1, 'https://example.com/photo.jpg', 0)`,
      [profileId],
    );
  }, 30000);

  afterEach(async () => {
    clearTestDb();
    await db.close();
  }, 30000);

  describe("getTeacherProfile", () => {
    it("should return full profile detail with certs, photos, event counts", async () => {
      const result = await getTeacherProfile(profileId);
      expect(result).not.toBeNull();
      expect(result!.bio).toBe("Expert AcroYoga teacher");
      expect(result!.user_name).toBe("Alice Teacher");
      expect(result!.certifications).toHaveLength(1);
      expect(result!.photos).toHaveLength(1);
      expect(result!.upcoming_event_count).toBe(0);
      expect(result!.past_event_count).toBe(0);
    });

    it("should return null for non-existent profile", async () => {
      const result = await getTeacherProfile("00000000-0000-0000-0000-000000000000");
      expect(result).toBeNull();
    });

    it("should return null for deleted profile", async () => {
      await db.query(
        `UPDATE teacher_profiles SET is_deleted = true, deleted_at = now() WHERE id = $1`,
        [profileId],
      );
      const result = await getTeacherProfile(profileId);
      expect(result).toBeNull();
    });
  });

  describe("getTeacherProfileByUserId", () => {
    it("should return profile by user ID", async () => {
      const result = await getTeacherProfileByUserId(userId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(profileId);
    });

    it("should return null for user without profile", async () => {
      const u2 = await db.query<{ id: string }>(
        "INSERT INTO users (email, name) VALUES ('other@test.com', 'Other') RETURNING id",
      );
      const result = await getTeacherProfileByUserId(u2.rows[0].id);
      expect(result).toBeNull();
    });
  });

  describe("updateTeacherProfile", () => {
    it("should update bio", async () => {
      const result = await updateTeacherProfile(profileId, { bio: "Updated bio" });
      expect(result!.bio).toBe("Updated bio");
    });

    it("should update specialties", async () => {
      const result = await updateTeacherProfile(profileId, { specialties: ["flow"] });
      expect(result!.specialties).toEqual(["flow"]);
    });

    it("should return null for non-existent profile", async () => {
      const result = await updateTeacherProfile("00000000-0000-0000-0000-000000000000", { bio: "x" });
      expect(result).toBeNull();
    });
  });

  describe("searchTeachers", () => {
    it("should return all teachers with default search", async () => {
      const result = await searchTeachers({});
      expect(result.total).toBe(1);
      expect(result.teachers).toHaveLength(1);
    });

    it("should filter by specialty", async () => {
      const result = await searchTeachers({ specialty: "washing_machines" });
      expect(result.total).toBe(1);

      const empty = await searchTeachers({ specialty: "icarian" });
      expect(empty.total).toBe(0);
    });

    it("should filter by badge status", async () => {
      const result = await searchTeachers({ badge: "verified" });
      expect(result.total).toBe(1);

      const empty = await searchTeachers({ badge: "expired" });
      expect(empty.total).toBe(0);
    });

    it("should search by text query", async () => {
      const result = await searchTeachers({ q: "Alice" });
      expect(result.total).toBe(1);

      const empty = await searchTeachers({ q: "Nonexistent" });
      expect(empty.total).toBe(0);
    });

    it("should paginate results", async () => {
      // Add 2 more teachers
      for (let i = 0; i < 2; i++) {
        const u = await db.query<{ id: string }>(
          `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
          [`t${i}@test.com`, `Teacher ${i}`],
        );
        await db.query(
          `INSERT INTO teacher_profiles (user_id, specialties, badge_status)
           VALUES ($1, '{}', 'verified')`,
          [u.rows[0].id],
        );
      }

      const page1 = await searchTeachers({ page: 1, limit: 2 });
      expect(page1.teachers).toHaveLength(2);
      expect(page1.total).toBe(3);

      const page2 = await searchTeachers({ page: 2, limit: 2 });
      expect(page2.teachers).toHaveLength(1);
    });
  });

  describe("deleteTeacherProfile", () => {
    it("should anonymise profile on delete", async () => {
      const deleted = await deleteTeacherProfile(profileId);
      expect(deleted).toBe(true);

      // Profile should be marked deleted
      const profile = await db.query(
        `SELECT * FROM teacher_profiles WHERE id = $1`, [profileId],
      );
      expect(profile.rows[0].is_deleted).toBe(true);
      expect(profile.rows[0].bio).toBeNull();
      expect(profile.rows[0].badge_status).toBe("revoked");
      expect(profile.rows[0].review_count).toBe(0);
    });

    it("should delete photos on profile deletion", async () => {
      await deleteTeacherProfile(profileId);
      const photos = await db.query(
        `SELECT * FROM teacher_photos WHERE teacher_profile_id = $1`, [profileId],
      );
      expect(photos.rows).toHaveLength(0);
    });

    it("should anonymise certifications on deletion", async () => {
      await deleteTeacherProfile(profileId);
      const certs = await db.query(
        `SELECT * FROM certifications WHERE teacher_profile_id = $1`, [profileId],
      );
      expect(certs.rows[0].name).toBe("Removed");
      expect(certs.rows[0].issuing_body).toBe("Removed");
      expect(certs.rows[0].status).toBe("revoked");
    });

    it("should return false for non-existent profile", async () => {
      const result = await deleteTeacherProfile("00000000-0000-0000-0000-000000000000");
      expect(result).toBe(false);
    });
  });
});
