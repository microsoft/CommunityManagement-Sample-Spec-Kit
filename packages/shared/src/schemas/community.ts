import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  bio: z.string().max(2000).optional(),
  homeCityId: z.string().uuid().optional(),
  defaultRole: z.enum(["base", "flyer", "hybrid"]).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
});

export const setSocialLinksSchema = z.object({
  links: z
    .array(
      z.object({
        platform: z.enum(["facebook", "instagram", "youtube", "website"]),
        url: z.string().url().max(2048),
        visibility: z.enum(["everyone", "followers", "friends", "hidden"]),
      }),
    )
    .max(4)
    .refine(
      (links) => {
        const platforms = links.map((l) => l.platform);
        return new Set(platforms).size === platforms.length;
      },
      { message: "Max 1 link per platform" },
    ),
});

export const detectCitySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const createFollowSchema = z.object({
  followeeId: z.string().uuid(),
});

export const createBlockSchema = z.object({
  blockedId: z.string().uuid(),
});

export const createMuteSchema = z.object({
  mutedId: z.string().uuid(),
});

export const createReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.enum(["harassment", "spam", "inappropriate", "other"]),
  details: z.string().max(5000).optional(),
});

export const reviewReportSchema = z.object({
  status: z.enum(["reviewed", "actioned", "dismissed"]),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const toggleReactionSchema = z.object({
  emoji: z.enum(["thumbs_up", "heart", "fire", "laugh", "sad", "celebrate"]),
});

export const pinMessageSchema = z.object({
  pinned: z.boolean(),
});

export const lockThreadSchema = z.object({
  locked: z.boolean(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export const listMessagesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
