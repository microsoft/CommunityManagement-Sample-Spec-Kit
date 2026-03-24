import { z } from "zod";

export const directorySearchSchema = z.object({
  search: z.string().max(200).optional(),
  city: z.string().uuid().optional(),
  country: z.string().max(255).optional(),
  continent: z.string().max(100).optional(),
  role: z.enum(["base", "flyer", "hybrid"]).optional(),
  teachersOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  relationship: z.enum(["following", "followers", "friends", "blocked"]).optional(),
  sort: z.enum(["alphabetical", "recent", "proximity"]).optional(),
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const setDirectoryVisibilitySchema = z.object({
  visible: z.boolean(),
});

export type DirectorySearchInput = z.infer<typeof directorySearchSchema>;
