import { z } from "zod";

export const createOccurrenceOverrideSchema = z.object({
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  overrideType: z.enum(["cancelled", "modified"]),
  modifiedFields: z
    .object({
      title: z.string().max(255).optional(),
      description: z.string().optional(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      venueId: z.string().uuid().optional(),
      capacity: z.number().int().positive().optional(),
      cost: z.number().min(0).optional(),
      concessionCost: z.number().min(0).optional(),
    })
    .optional(),
});

export const updateOccurrenceOverrideSchema = z.object({
  modifiedFields: z.object({
    title: z.string().max(255).optional(),
    description: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    venueId: z.string().uuid().optional(),
    capacity: z.number().int().positive().optional(),
    cost: z.number().min(0).optional(),
    concessionCost: z.number().min(0).optional(),
  }),
});

export const seriesEditSchema = z.object({
  scope: z.enum(["all", "this", "thisAndFuture"]),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  changes: z.record(z.string(), z.unknown()).default({}),
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  cost: z.number().min(0).optional(),
  concessionCost: z.number().min(0).optional(),
  venueId: z.string().uuid().optional(),
  recurrenceRule: z.string().optional(),
});

export const createEventGroupSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["festival", "combo", "series"]),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3),
  posterImageUrl: z.string().url().max(2048).optional(),
  eventIds: z.array(z.string().uuid()).min(1),
});

export const updateEventGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  addEventIds: z.array(z.string().uuid()).optional(),
  removeEventIds: z.array(z.string().uuid()).optional(),
});

export const createTicketTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  cost: z.number().min(0),
  concessionCost: z.number().min(0).optional(),
  capacity: z.number().int().positive(),
  coversAllEvents: z.boolean(),
  coveredEventIds: z.array(z.string().uuid()).optional(),
});

export const updateTicketTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  cost: z.number().min(0).optional(),
  concessionCost: z.number().min(0).optional(),
  capacity: z.number().int().positive().optional(),
});

export const bookTicketSchema = z.object({
  ticketTypeId: z.string().uuid(),
  pricingTier: z.enum(["standard", "concession"]).default("standard"),
  useCredits: z.boolean().default(false),
});

export const concessionApplicationSchema = z.object({
  evidence: z.string().max(2000).optional(),
});

export const reviewConcessionSchema = z.object({
  action: z.enum(["approve", "reject", "revoke"]),
});

export const listOccurrencesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeCancelled: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
