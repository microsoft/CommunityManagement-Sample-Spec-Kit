import { z } from "zod";

export const submitRequestSchema = z.object({
  scopeValue: z.string().min(1),
  message: z.string().optional(),
});

export const reviewRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});

export const listRequestsQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  scopeType: z.literal("city").optional(),
  scopeValue: z.string().optional(),
  userId: z.string().uuid().optional(),
});
