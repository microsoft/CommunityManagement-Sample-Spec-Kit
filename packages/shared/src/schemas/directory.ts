import { z } from "zod";

export const directorySearchSchema = z.object({
  q: z.string().max(200).optional(),
  cityId: z.string().uuid().optional(),
  role: z.enum(["base", "flyer", "hybrid"]).optional(),
  verifiedTeacher: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  relationship: z.enum(["following", "followers", "friends"]).optional(),
  sort: z.enum(["name", "proximity"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const setDirectoryVisibilitySchema = z.object({
  visible: z.boolean(),
});

export type DirectorySearchInput = z.infer<typeof directorySearchSchema>;
