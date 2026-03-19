import { z } from "zod";
import { TEACHER_SPECIALTIES } from "../types/teachers";

export const submitApplicationSchema = z.object({
  bio: z.string().max(5000).optional(),
  specialties: z.array(z.enum(TEACHER_SPECIALTIES as unknown as [string, ...string[]])).min(1),
  credentials: z.array(z.object({
    name: z.string().min(1).max(255),
    issuingBody: z.string().min(1).max(255),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    proofDocumentUrl: z.string().url().optional(),
  })).min(1),
});

export const reviewRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(2000).optional(),
});

export const updateProfileSchema = z.object({
  bio: z.string().max(5000).optional(),
  specialties: z.array(z.enum(TEACHER_SPECIALTIES as unknown as [string, ...string[]])).optional(),
});

export const createCertificationSchema = z.object({
  name: z.string().min(1).max(255),
  issuingBody: z.string().min(1).max(255),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateCertificationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  issuingBody: z.string().min(1).max(255).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const verifyCertificationSchema = z.object({
  decision: z.enum(["verified", "revoked"]),
});

export const assignTeacherSchema = z.object({
  teacherProfileId: z.string().uuid(),
  role: z.enum(["lead", "assistant"]).default("lead"),
});

export const submitReviewSchema = z.object({
  teacherProfileId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

export const moderateReviewSchema = z.object({
  action: z.enum(["hide", "unhide"]),
  reason: z.string().max(2000).optional(),
});

export const teacherSearchSchema = z.object({
  q: z.string().optional(),
  specialty: z.enum(TEACHER_SPECIALTIES as unknown as [string, ...string[]]).optional(),
  badge: z.enum(["verified", "expired"]).optional(),
  city: z.string().optional(),
  sort: z.enum(["rating", "review_count", "name"]).default("rating"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
