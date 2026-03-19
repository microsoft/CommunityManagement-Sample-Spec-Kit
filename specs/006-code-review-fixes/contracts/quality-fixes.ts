/**
 * Quality & Validation Fixes Contract — Spec 006
 *
 * Defines validation, error consistency, and cleanup changes.
 */

// ── Zod Schema for Teacher Photos ─────────────────────────────────

/**
 * POST /api/teachers/[id]/photos
 *
 * Current: manual typeof checks on request body fields
 * Fixed: Zod schema at API boundary (Constitution Principle IV)
 */
interface TeacherPhotoValidation {
  schema: {
    url: 'z.string().url()';
    alt_text: 'z.string().max(200).optional()';
    display_order: 'z.number().int().min(0).optional()';
  };
  /** Validation errors use standard error shape */
  errorResponse: {
    status: 400;
    body: {
      error: 'Validation failed';
      code: 'VALIDATION_ERROR';
      details: 'ZodError issues array';
    };
  };
}

// ── ILIKE Wildcard Escaping ───────────────────────────────────────

/**
 * All ILIKE search endpoints must escape wildcards in user input.
 *
 * Affected endpoints:
 *   GET /api/events?search=...
 *   GET /api/venues?search=...
 *   GET /api/teachers?search=...
 *
 * Utility function signature:
 */
interface IlikeEscaping {
  /** Escapes %, _, and \ in user-supplied search input */
  utilityFunction: 'escapeIlike(input: string): string';
  /** Location: @/lib/db/utils.ts (or similar shared location) */
  location: 'shared database utilities';
  /** Characters escaped: \ → \\, % → \%, _ → \_ */
  escapedCharacters: ['\\', '%', '_'];
}

// ── Error Response Consistency ────────────────────────────────────

/**
 * All error responses MUST use the shared error helpers from
 * @/lib/errors. No ad-hoc NextResponse.json({ message }) patterns.
 *
 * Standard shape:
 *   { error: string, code: string, details?: unknown }
 *
 * Migration: find all routes returning non-standard error shapes
 * and replace with the appropriate helper:
 *   - unauthorizedError()   → 401
 *   - forbiddenError()      → 403
 *   - notFoundError()       → 404
 *   - validationError()     → 400
 *   - serverError()         → 500
 */

// ── Stripe API Version Constant ───────────────────────────────────

/**
 * Current: Stripe API version string duplicated across files
 * Fixed: Single shared constant
 */
interface StripeVersionConstant {
  /** Constant definition location */
  location: '@/lib/payments/constants.ts';
  /** Constant name */
  name: 'STRIPE_API_VERSION';
  /** All files referencing the Stripe API version import this constant */
  consumers: 'all files that reference Stripe API version';
}
