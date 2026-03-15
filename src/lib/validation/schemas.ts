import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startDatetime: z.string().datetime(),
  endDatetime: z.string().datetime(),
  venueId: z.string().uuid(),
  category: z.enum(["jam", "workshop", "class", "festival", "social", "retreat", "teacher_training"]),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all_levels"]),
  prerequisites: z.string().optional(),
  cost: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  concessionCost: z.number().min(0).optional(),
  capacity: z.number().int().positive(),
  refundWindowHours: z.number().int().min(0).optional(),
  waitlistCutoffHours: z.number().int().min(0).optional(),
  isExternal: z.boolean().optional(),
  externalUrl: z.string().url().max(2048).optional(),
  posterImageUrl: z.string().url().max(2048).optional(),
  recurrenceRule: z.string().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startDatetime: z.string().datetime().optional(),
  endDatetime: z.string().datetime().optional(),
  venueId: z.string().uuid().optional(),
  category: z.enum(["jam", "workshop", "class", "festival", "social", "retreat", "teacher_training"]).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all_levels"]).optional(),
  prerequisites: z.string().optional(),
  cost: z.number().min(0).optional(),
  concessionCost: z.number().min(0).optional(),
  capacity: z.number().int().positive().optional(),
  refundWindowHours: z.number().int().min(0).optional(),
  waitlistCutoffHours: z.number().int().min(0).optional(),
  posterImageUrl: z.string().url().max(2048).optional(),
  recurrenceRule: z.string().optional(),
});

export const listEventsSchema = z.object({
  city: z.string().optional(),
  category: z.enum(["jam", "workshop", "class", "festival", "social", "retreat", "teacher_training"]).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all_levels"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const createVenueSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  cityId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const updateVenueSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const createRsvpSchema = z.object({
  role: z.enum(["base", "flyer", "hybrid"]),
  nameVisible: z.boolean().optional().default(true),
  occurrenceDate: z.string().date().optional(),
  prerequisiteConfirmed: z.boolean().optional(),
});

export const cancelRsvpSchema = z.object({
  occurrenceDate: z.string().date().optional(),
  refundChoice: z.enum(["credit", "refund"]).optional(),
});

export const joinWaitlistSchema = z.object({
  role: z.enum(["base", "flyer", "hybrid"]),
  occurrenceDate: z.string().date().optional(),
});

export const nearestCitySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});
